import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Maximum payload size to support Base64 images easily
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// Local path to store issues persistently
const DATA_FILE = path.join(process.cwd(), "issues.json");

// Pre-seeded high-quality issues to show immediate data in a hackathon
const DEFAULT_ISSUES = [
  {
    id: "issue-1",
    title: "Shattered Windshield Hazard / Giant Pothole",
    description: "Deep, jagged pothole in the left lane of Grand Avenue near 5th St. Several cars have popped tires or swerved into oncoming traffic to avoid it.",
    location: "740 Grand Avenue, Business District",
    category: "Road Damage",
    urgency: "Critical",
    status: "Open",
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
    verificationCount: 14,
    verifiedBy: ["user-mock-1", "user-mock-2"],
    urgencyVotes: { Low: 0, Medium: 1, High: 3, Critical: 11 },
    votedUrgency: {
      "citizen-1": "Critical", "citizen-2": "Critical", "citizen-3": "Critical", "citizen-4": "Critical", "citizen-5": "Critical",
      "citizen-6": "Critical", "citizen-7": "Critical", "citizen-8": "Critical", "citizen-9": "Critical", "citizen-10": "Critical",
      "citizen-11": "Critical", "citizen-12": "High", "citizen-13": "High", "citizen-14": "High", "citizen-15": "Medium"
    },
    reporterName: "Marcus Sterling",
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    aiAnalysis: {
      category: "Road Damage",
      urgency: "Critical",
      reason: "The deep pothole causes immediate road safety hazards, tire damage, and dangerous swerving behavior."
    },
    progressStep: 4, // Working / In Progress
    comments: [
      {
        id: "comment-1-1",
        authorName: "Officer Ramos",
        authorRole: "admin",
        content: "Our public works team has reviewed this case. An asphalt patch crew is scheduled to fill this pothole tomorrow morning on June 24.",
        createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
      },
      {
        id: "comment-1-2",
        authorName: "Marcus Sterling",
        authorRole: "citizen",
        content: "Outstanding! Thank you for the update. Looking forward to Grand Ave being driveable again.",
        createdAt: new Date(Date.now() - 15 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: "issue-2",
    title: "Overflowing Garbage and Hazardous Litter",
    description: "The main public trash containers at Oakwood Park are totally packed. Waste is blowing out onto the children's custom play area and attracting rodents.",
    location: "Oakwood Park playground corner",
    category: "Garbage",
    urgency: "High",
    status: "Open",
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
    verificationCount: 8,
    verifiedBy: ["user-mock-2"],
    urgencyVotes: { Low: 1, Medium: 2, High: 9, Critical: 2 },
    votedUrgency: {
      "citizen-1": "High", "citizen-2": "High", "citizen-3": "High", "citizen-4": "High", "citizen-5": "High",
      "citizen-6": "High", "citizen-7": "High", "citizen-8": "High", "citizen-9": "High", "citizen-10": "Critical",
      "citizen-11": "Critical", "citizen-12": "Medium", "citizen-13": "Medium", "citizen-14": "Low"
    },
    reporterName: "Sarah Chen",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    aiAnalysis: {
      category: "Garbage",
      urgency: "High",
      reason: "Overflowing bins near children's playgrounds lead to direct sanitation and public health concerns."
    },
    progressStep: 2, // Under Review
    comments: [
      {
        id: "comment-2-1",
        authorName: "Sanitation Supervisor",
        authorRole: "admin",
        content: "A pickup is ordered for today's afternoon sweep. We are also reviewing daily bin replacement frequencies.",
        createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: "issue-3",
    title: "Sewer Water Main Leakage",
    description: "Water is continuously bubbling up from underneath the brick sidewalk. The entire block is flooded with stagnant water making it impossible for pedestrians to cross safely.",
    location: "Crossroad of Elm & Pine St",
    category: "Water Leakage",
    urgency: "High",
    status: "Open",
    imageUrl: "https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&q=80&w=600",
    verificationCount: 19,
    verifiedBy: ["user-mock-4", "user-mock-5", "user-mock-6"],
    urgencyVotes: { Low: 0, Medium: 1, High: 15, Critical: 4 },
    votedUrgency: {
      "citizen-1": "High", "citizen-2": "High", "citizen-3": "High", "citizen-4": "High", "citizen-5": "High",
      "citizen-6": "High", "citizen-7": "High", "citizen-8": "High", "citizen-9": "High", "citizen-10": "High",
      "citizen-11": "High", "citizen-12": "High", "citizen-13": "High", "citizen-14": "High", "citizen-15": "High",
      "citizen-16": "Critical", "citizen-17": "Critical", "citizen-18": "Critical", "citizen-19": "Critical", "citizen-20": "Medium"
    },
    reporterName: "David K.",
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    aiAnalysis: {
      category: "Water Leakage",
      urgency: "High",
      reason: "Significant water flow on public walkways compromises structural integrity of pavement and creates heavy transit issues."
    },
    progressStep: 1, // Submitted
    comments: []
  },
  {
    id: "issue-4",
    title: "Broken Streetlight Near School Path",
    description: "The main streetlights near the pedestrian pathway are entirely out. It is pitch-black at night, forcing kids walking home from evening activities into the dark.",
    location: "Alley behind Lincoln High School",
    category: "Street Light",
    urgency: "Medium",
    status: "Open",
    imageUrl: "https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&q=80&w=600",
    verificationCount: 5,
    verifiedBy: [],
    urgencyVotes: { Low: 0, Medium: 8, High: 2, Critical: 0 },
    votedUrgency: {
      "citizen-1": "Medium", "citizen-2": "Medium", "citizen-3": "Medium", "citizen-4": "Medium",
      "citizen-5": "Medium", "citizen-6": "Medium", "citizen-7": "Medium", "citizen-8": "Medium",
      "citizen-9": "High", "citizen-10": "High"
    },
    reporterName: "Elena Rostova",
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    aiAnalysis: {
      category: "Street Light",
      urgency: "Medium",
      reason: "Complete darkness on school routes reduces visual protection and significantly highlights neighborhood security concerns."
    },
    progressStep: 3, // Accepted by Municipality
    comments: []
  },
  {
    id: "issue-5",
    title: "Fallen Tree Branch in Park Walkway",
    description: "A large heavy tree branch broke off and blockaded the beautiful botanical garden path. Already resolved by citizens shifting the core sections out of the way.",
    location: "North Entrance, Botanical Gardens",
    category: "Public Safety",
    urgency: "Low",
    status: "Resolved",
    imageUrl: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&q=80&w=600",
    verificationCount: 3,
    verifiedBy: [],
    urgencyVotes: { Low: 5, Medium: 1, High: 0, Critical: 0 },
    votedUrgency: {
      "citizen-1": "Low", "citizen-2": "Low", "citizen-3": "Low", "citizen-4": "Low", "citizen-5": "Low", "citizen-6": "Medium"
    },
    reporterName: "Toby Miller",
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    aiAnalysis: {
      category: "Public Safety",
      urgency: "Low",
      reason: "Low urgent hazard as pedestrian path flow is blocked but can be easily bypassed, major branches cleared."
    },
    progressStep: 5, // Fully Completed
    completedImageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600",
    citizenSatisfied: true,
    comments: [
      {
        id: "comment-5-1",
        authorName: "Toby Miller",
        authorRole: "citizen",
        content: "Awesome, thank you neighborhood crews for hauling the logs away after we relocated them!",
        createdAt: new Date(Date.now() - 60 * 3600 * 1000).toISOString()
      }
    ]
  }
];

// Helper to get resolution suggestions and department routing based on category
function getResolutionSuggestions(category: string): { suggestedAction: string; estimatedDepartment: string } {
  switch (category) {
    case "Road Damage":
      return {
        estimatedDepartment: "Public Works Department",
        suggestedAction: "Repair surface cracks, patch potholes, and re-level street surface."
      };
    case "Garbage":
      return {
        estimatedDepartment: "Sanitation Department",
        suggestedAction: "Dispatch refuse team to clear dumped waste and sanitize area."
      };
    case "Water Leakage":
      return {
        estimatedDepartment: "Water Department",
        suggestedAction: "Locate source of leaking conduit, close pressure valve, and repair seal."
      };
    case "Street Light":
      return {
        estimatedDepartment: "Electricity Department",
        suggestedAction: "Replace damaged bulb and inspect wiring."
      };
    case "Public Safety":
      return {
        estimatedDepartment: "Public Safety Division",
        suggestedAction: "Set up safety markers/cordon and dispatch emergency inspector."
      };
    default:
      return {
        estimatedDepartment: "Municipal Services Department",
        suggestedAction: "Schedule general municipal inspection and log for maintenance."
      };
  }
}

// Helper to load issues from JSON
function loadIssues() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        return list.map((item: any) => {
          const suggestions = getResolutionSuggestions(item.category || item.aiAnalysis?.category || "Other");
          const aiAnalysis = item.aiAnalysis ? {
            ...item.aiAnalysis,
            suggestedAction: item.aiAnalysis.suggestedAction || suggestions.suggestedAction,
            estimatedDepartment: item.aiAnalysis.estimatedDepartment || suggestions.estimatedDepartment,
          } : {
            category: item.category || "Other",
            urgency: item.urgency || "Low",
            reason: item.description || "Pre-seeded case.",
            suggestedAction: suggestions.suggestedAction,
            estimatedDepartment: suggestions.estimatedDepartment
          };
          return {
            ...item,
            aiAnalysis,
            progressStep: item.progressStep || (item.status === "Resolved" ? 5 : 1),
            completedImageUrl: item.completedImageUrl || (item.status === "Resolved" ? "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600" : undefined),
            citizenSatisfied: item.citizenSatisfied !== undefined ? item.citizenSatisfied : (item.status === "Resolved" ? true : undefined),
            comments: item.comments || []
          };
        });
      }
    }
  } catch (error) {
    console.error("Error reading issues file, falling back to pre-seeded:", error);
  }
  // Write default issues to file if not present
  try {
    const enrichedDefaults = DEFAULT_ISSUES.map((item: any) => {
      const suggestions = getResolutionSuggestions(item.category);
      return {
        ...item,
        aiAnalysis: {
          ...item.aiAnalysis,
          suggestedAction: suggestions.suggestedAction,
          estimatedDepartment: suggestions.estimatedDepartment
        }
      };
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(enrichedDefaults, null, 2), "utf-8");
    return enrichedDefaults;
  } catch (err) {
    console.error("Could not write default issues:", err);
  }
  return DEFAULT_ISSUES;
}

// Helper to save issues to JSON
function saveIssues(issues: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(issues, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing issues to file:", error);
  }
}

// In-Memory state updated on launch
let issues = loadIssues();

// Helper keyword-based classifier fallback
function localKeywordAnalysis(description: string, title: string): { 
  category: string; 
  urgency: string; 
  reason: string;
  suggestedAction: string;
  estimatedDepartment: string;
} {
  const combined = (title + " " + description).toLowerCase();
  let category = "Other";
  let urgency = "Low";
  let reason = "Classified locally using standard keyword logic (Gemini API key not configured).";

  // Category selection
  if (combined.includes("pothole") || combined.includes("road") || combined.includes("asphalt") || combined.includes("tarmac") || combined.includes("street damage") || combined.includes("pavement")) {
    category = "Road Damage";
  } else if (combined.includes("garbage") || combined.includes("trash") || combined.includes("dump") || combined.includes("litter") || combined.includes("waste") || combined.includes("rubbish") || combined.includes("bin")) {
    category = "Garbage";
  } else if (combined.includes("water") || combined.includes("leak") || combined.includes("burst") || combined.includes("pipe") || combined.includes("sewer") || combined.includes("flood") || combined.includes("flow") || combined.includes("bubbles")) {
    category = "Water Leakage";
  } else if (combined.includes("light") || combined.includes("bulb") || combined.includes("streetlight") || combined.includes("dark") || combined.includes("flicker") || combined.includes("lamps")) {
    category = "Street Light";
  } else if (combined.includes("safety") || combined.includes("danger") || combined.includes("hazard") || combined.includes("shattered") || combined.includes("glass") || combined.includes("fire") || combined.includes("security") || combined.includes("broken")) {
    category = "Public Safety";
  }

  // Urgency selection
  if (combined.includes("critical") || combined.includes("emergency") || combined.includes("severe") || combined.includes("oncoming traffic") || combined.includes("die") || combined.includes("injury") || combined.includes("crash")) {
    urgency = "Critical";
    reason += " Highly dangerous terms detected pointing to severe hazard.";
  } else if (combined.includes("high") || combined.includes("danger") || combined.includes("hazardous") || combined.includes("rodents") || combined.includes("frequent") || combined.includes("flood")) {
    urgency = "High";
    reason += " Major disruption or safety warning markers analyzed.";
  } else if (combined.includes("medium") || combined.includes("dark") || combined.includes("pedestrian") || combined.includes("bypassed")) {
    urgency = "Medium";
    reason += " Moderate local context requiring near future attention.";
  } else {
    urgency = "Low";
    reason += " Low severity cosmetic or secondary utility correction.";
  }

  const suggestions = getResolutionSuggestions(category);

  return { 
    category, 
    urgency, 
    reason, 
    suggestedAction: suggestions.suggestedAction,
    estimatedDepartment: suggestions.estimatedDepartment 
  };
}

// --- API ROUTES ---

// 1. Get all issues
app.get("/api/issues", (req, res) => {
  res.json(issues);
});

// 2. Submit issue with AI auto-categorization
app.post("/api/issues", async (req, res) => {
  const { title, description, location, imageUrl, reporterName } = req.body;

  if (!title || !description || !location) {
    return res.status(400).json({ error: "Title, description, and location are required fields." });
  }

  const client = getGeminiClient();
  let categoryStr = "Other";
  let urgencyStr = "Low";
  let reasonStr = "AI processing was skipped.";
  let suggestedActionStr = "";
  let estimatedDepartmentStr = "";
  let isFallback = true;

  if (client) {
    try {
      console.log("Analyzing via Gemini API model gemini-3.5-flash...");
      
      const systemInstruction = 
        "You are an expert civic AI. Your job is to analyze community reports and return clean structured JSON categorization.\n" +
        "Categorize only into: 'Road Damage', 'Garbage', 'Water Leakage', 'Street Light', 'Public Safety', 'Other'.\n" +
        "Assign urgency level only as: 'Low', 'Medium', 'High', 'Critical'.\n" +
        "Provide a concise, polite, objective reason (under 130 characters) for your choice.\n" +
        "Also suggest a concrete physical action to resolve the issue (under 120 characters) and the responsible department.\n" +
        "Department mapping rules (STRICT): \n" +
        "- 'Road Damage' -> 'Public Works Department'\n" +
        "- 'Garbage' -> 'Sanitation Department'\n" +
        "- 'Water Leakage' -> 'Water Department'\n" +
        "- 'Street Light' -> 'Electricity Department'\n" +
        "- 'Public Safety' -> 'Public Safety Division'\n" +
        "- 'Other' -> 'Municipal Services Department'";

      // We assemble the message parts. Multimodal if there is an image base64
      let contentParts: any[] = [];
      
      if (imageUrl && imageUrl.startsWith("data:")) {
        const matches = imageUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.*)$/);
        if (matches && matches.length === 3) {
          contentParts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      }

      contentParts.push({
        text: `Analyze this citizen report and classify it.\n\nTitle: ${title}\nDescription: ${description}\nLocation: ${location}`
      });

      // Exponential backoff and retry mechanism for resilience on transient overloads/503 errors
      let response = null;
      let retries = 3;
      let delay = 600; // 600ms initial wait delay
      const primaryModel = "gemini-3.5-flash";

      while (retries > 0) {
        try {
          console.log(`Sending citizen payload to ${primaryModel}...`);
          response = await client.models.generateContent({
            model: primaryModel,
            contents: contentParts,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    description: "Must be: 'Road Damage', 'Garbage', 'Water Leakage', 'Street Light', 'Public Safety', or 'Other'"
                  },
                  urgency: {
                    type: Type.STRING,
                    description: "Must be: 'Low', 'Medium', 'High', or 'Critical'"
                  },
                  reason: {
                    type: Type.STRING,
                    description: "1 short sentence of explanation."
                  },
                  suggestedAction: {
                    type: Type.STRING,
                    description: "A concrete recommended resolution action (e.g., 'Replace damaged bulb and inspect wiring.')"
                  },
                  estimatedDepartment: {
                    type: Type.STRING,
                    description: "Estimated department: 'Public Works Department', 'Sanitation Department', 'Water Department', 'Electricity Department', 'Public Safety Division', or 'Municipal Services Department'"
                  }
                },
                required: ["category", "urgency", "reason", "suggestedAction", "estimatedDepartment"]
              }
            }
          });
          break; // break loop on success
        } catch (err: any) {
          retries--;
          console.warn(`Gemini API attempt failed with model ${primaryModel} (remaining attempts: ${retries}): ${err?.message || err}`);
          if (retries === 0) {
            throw err; // bubble up on exhaust
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2.2; // increase delay exponentially
        }
      }

      if (response && response.text) {
        const payload = JSON.parse(response.text.trim());
        categoryStr = payload.category || "Other";
        urgencyStr = payload.urgency || "Low";
        reasonStr = payload.reason || "Analyzed successfully.";
        suggestedActionStr = payload.suggestedAction || "";
        estimatedDepartmentStr = payload.estimatedDepartment || "";
        isFallback = false;
      }
    } catch (err: any) {
      console.warn("Gemini API categorization failed, using local fallback classifier:", err.message || err);
      // Run local keyword fallback
      const localAnalysis = localKeywordAnalysis(description, title);
      categoryStr = localAnalysis.category;
      urgencyStr = localAnalysis.urgency;
      reasonStr = description;
      suggestedActionStr = localAnalysis.suggestedAction;
      estimatedDepartmentStr = localAnalysis.estimatedDepartment;
    }
  } else {
    console.log("No Gemini API Key found or default key. Using local keyword classifier fallback.");
    const localAnalysis = localKeywordAnalysis(description, title);
    categoryStr = localAnalysis.category;
    urgencyStr = localAnalysis.urgency;
    reasonStr = localAnalysis.reason + " (Local fallback engine - configure secrets key for full multimodal Gemini AI)";
    suggestedActionStr = localAnalysis.suggestedAction;
    estimatedDepartmentStr = localAnalysis.estimatedDepartment;
  }

  // Build the new issue structure
  const suggestions = getResolutionSuggestions(categoryStr);
  const newIssue = {
    id: `issue-${Date.now()}`,
    title,
    description,
    location,
    category: categoryStr,
    urgency: urgencyStr,
    status: "Open",
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&q=80&w=600", // fallback default generic
    verificationCount: 0,
    verifiedBy: [],
    urgencyVotes: { Low: 0, Medium: 0, High: 0, Critical: 0 },
    votedUrgency: {},
    reporterName: reporterName || "Anonymous Citizen",
    createdAt: new Date().toISOString(),
    aiAnalysis: {
      category: categoryStr,
      urgency: urgencyStr,
      reason: reasonStr,
      isFallback,
      suggestedAction: suggestedActionStr || suggestions.suggestedAction,
      estimatedDepartment: estimatedDepartmentStr || suggestions.estimatedDepartment
    },
    progressStep: 1 // Starts at 'Submitted'
  };

  issues.unshift(newIssue);
  saveIssues(issues);

  res.json(newIssue);
});

// 3. Verify / Upvote an issue
app.post("/api/issues/:id/verify", (req, res) => {
  const { id } = req.params;
  const { userId } = req.body; // mock user reference from client

  const issueIndex = issues.findIndex(i => i.id === id);
  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const issue = issues[issueIndex];
  const user = userId || "anonymous-session";

  // Prevent double upvotes if user session provided
  if (!issue.verifiedBy.includes(user)) {
    issue.verifiedBy.push(user);
    issue.verificationCount += 1;
    saveIssues(issues);
  } else {
    // If already verified, clicking again un-verifies! High fidelity behavior
    issue.verifiedBy = issue.verifiedBy.filter(u => u !== user);
    issue.verificationCount = Math.max(0, issue.verificationCount - 1);
    saveIssues(issues);
  }

  res.json(issue);
});

// 4. Vote on Urgency level
app.post("/api/issues/:id/vote-urgency", (req, res) => {
  const { id } = req.params;
  const { vote, userId } = req.body; // 'Low' | 'Medium' | 'High' | 'Critical', and the session userId

  if (!["Low", "Medium", "High", "Critical"].includes(vote)) {
    return res.status(400).json({ error: "Invalid gravity rating" });
  }

  const issueIndex = issues.findIndex(i => i.id === id);
  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const issue = issues[issueIndex];
  if (!issue.urgencyVotes) {
    issue.urgencyVotes = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  }
  if (!issue.votedUrgency) {
    issue.votedUrgency = {};
  }

  const user = userId || "anonymous-session";
  const oldVote = issue.votedUrgency[user];

  if (oldVote === vote) {
    // If user clicked the same level again, toggle it off (remove user vote)
    delete issue.votedUrgency[user];
    issue.urgencyVotes[oldVote] = Math.max(0, (issue.urgencyVotes[oldVote] || 1) - 1);
  } else {
    // If user has a previous vote, decrement it
    if (oldVote) {
      issue.urgencyVotes[oldVote] = Math.max(0, (issue.urgencyVotes[oldVote] || 1) - 1);
    }
    // Set the new vote for the user
    issue.votedUrgency[user] = vote;
    issue.urgencyVotes[vote as keyof typeof issue.urgencyVotes] = (issue.urgencyVotes[vote as keyof typeof issue.urgencyVotes] || 0) + 1;
  }

  saveIssues(issues);
  res.json(issue);
});

// 5. Change status (e.g. mark resolved)
app.post("/api/issues/:id/resolve", (req, res) => {
  const { id } = req.params;

  const issueIndex = issues.findIndex(i => i.id === id);
  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const issue = issues[issueIndex];
  issue.status = issue.status === "Open" ? "Resolved" : "Open";
  
  // Keep progressStep in sync with raw status toggle
  if (issue.status === "Resolved") {
    issue.progressStep = 5;
    if (!issue.completedImageUrl) {
      issue.completedImageUrl = "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600"; // default resolved sample
    }
  } else {
    issue.progressStep = 4; // Reset back to 'Working' stage if reopened
  }

  saveIssues(issues);

  res.json(issue);
});

// 6. Update administrative progress step and upload completion proof
app.post("/api/issues/:id/progress", (req, res) => {
  const { id } = req.params;
  const { progressStep, completedImageUrl } = req.body;

  const stepNum = parseInt(progressStep, 10);
  if (isNaN(stepNum) || stepNum < 1 || stepNum > 5) {
    return res.status(400).json({ error: "Invalid progress step. Must be between 1 and 5." });
  }

  const issueIndex = issues.findIndex(i => i.id === id);
  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const issue = issues[issueIndex];
  issue.progressStep = stepNum;

  if (completedImageUrl) {
    issue.completedImageUrl = completedImageUrl;
  }

  if (stepNum === 5) {
    issue.status = "Resolved";
    if (!issue.completedImageUrl) {
      // default fallbacks for visual satisfaction
      issue.completedImageUrl = "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600";
    }
  } else {
    issue.status = "Open";
  }

  saveIssues(issues);
  res.json(issue);
});

// 7. Toggle citizen satisfaction feedback
app.post("/api/issues/:id/satisfy", (req, res) => {
  const { id } = req.params;
  const { citizenSatisfied } = req.body;

  const issueIndex = issues.findIndex(i => i.id === id);
  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const issue = issues[issueIndex];
  issue.citizenSatisfied = !!citizenSatisfied;

  saveIssues(issues);
  res.json(issue);
});

// 8. Add comment to issue
app.post("/api/issues/:id/comments", (req, res) => {
  const { id } = req.params;
  const { authorName, authorRole, content } = req.body;

  if (!authorName || !authorRole || !content) {
    return res.status(400).json({ error: "Missing required fields: authorName, authorRole, or content" });
  }

  const issueIndex = issues.findIndex(i => i.id === id);
  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const issue = issues[issueIndex];
  if (!issue.comments) {
    issue.comments = [];
  }

  const newComment = {
    id: `comment-${Date.now()}`,
    authorName,
    authorRole,
    content,
    createdAt: new Date().toISOString()
  };

  issue.comments.push(newComment);
  saveIssues(issues);

  res.json(issue);
});

// --- VITE AND CLIENT SETUP ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    console.log(`Using ${process.env.GEMINI_API_KEY ? 'active' : 'fallback'} API configurations.`);
  });
}

startServer();
