import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Flame, 
  MapPin, 
  Search, 
  ThumbsUp, 
  Upload, 
  User, 
  Calendar, 
  Sparkles, 
  Check, 
  FileText, 
  Filter, 
  ChevronRight, 
  Loader2, 
  Info,
  ArrowRight,
  TrendingUp,
  X,
  HelpCircle,
  ClipboardList,
  Mail,
  LogOut
} from "lucide-react";
import { Issue, CategoryType, UrgencyType } from "./types";
import { IssueComments } from "./components/IssueComments";

export default function App() {
  // Navigation tabs: 'dashboard' | 'report' | 'resolved' | 'admin'
  const [activeTab, setActiveTab] = useState<"dashboard" | "report" | "resolved" | "admin">("dashboard");
  const [showGuide, setShowGuide] = useState(true);
  
  // Data State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Authenticated user state (stored locally)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: "citizen" | "admin" } | null>(null);
  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginRole, setLoginRole] = useState<"citizen" | "admin">("citizen");
  const [adminPasscode, setAdminPasscode] = useState("");

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | "All">("All");
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyType | "All">("All");
  const [adminSortType, setAdminSortType] = useState<"priority" | "pending" | "category">("priority");
  
  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formReporterName, setFormReporterName] = useState("");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [formValidationError, setFormValidationError] = useState("");
  
  // AI Submission Loading Modal State
  const [submittingWithAI, setSubmittingWithAI] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [aiError, setAiError] = useState("");
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

  // Unique client session reference to track personal actions
  const [currentUserSession, setCurrentUserSession] = useState("");

  useEffect(() => {
    // Set up unique user token for high fidelity upvotes toggle with safe try/catch
    let sessionToken = null;
    try {
      sessionToken = localStorage.getItem("community_hero_session");
    } catch (e) {
      console.warn("localStorage standard access denied in sandboxed frame. Falling back.");
    }

    if (!sessionToken) {
      sessionToken = `citizen-${Math.random().toString(36).substring(2, 11)}`;
      try {
        localStorage.setItem("community_hero_session", sessionToken);
      } catch (e) {
        // Safe fail
      }
    }
    setCurrentUserSession(sessionToken);

    // Load logged in user authentication session
    try {
      const savedUser = localStorage.getItem("community_hero_logged_in_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.name && parsed.email && parsed.role) {
          setCurrentUser(parsed);
          if (parsed.role === "citizen") {
            setFormReporterName(parsed.name);
          } else if (parsed.role === "admin") {
            setActiveTab("admin");
          }
        }
      } else {
        const savedCitizen = localStorage.getItem("citizen_logged_in_user");
        if (savedCitizen) {
          const parsed = JSON.parse(savedCitizen);
          if (parsed && parsed.name && parsed.email) {
            const userObj = { ...parsed, role: "citizen" as const };
            setCurrentUser(userObj);
            setFormReporterName(parsed.name);
          }
        }
      }
    } catch (err) {
      console.warn("Could not read citizen authentication session:", err);
    }

    // Fetch Initial Issues
    fetchIssues();
  }, []);

  // Simple authentication processing
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginRole === "citizen") {
      if (!loginName.trim() || !loginEmail.trim()) {
        setLoginError("Please enter your name and email address.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
        setLoginError("Please enter a valid email address.");
        return;
      }

      setLoginError("");
      const userObj = {
        name: loginName.trim(),
        email: loginEmail.trim(),
        role: "citizen" as const
      };

      try {
        localStorage.setItem("community_hero_logged_in_user", JSON.stringify(userObj));
        localStorage.setItem("citizen_logged_in_user", JSON.stringify({ name: userObj.name, email: userObj.email }));
      } catch (err) {
        console.warn("Could not save citizen user session:", err);
      }

      setCurrentUser(userObj);
      setFormReporterName(userObj.name);
      setActiveTab("dashboard");
    } else {
      // Admin Authentication
      if (!loginName.trim() || !loginEmail.trim()) {
        setLoginError("Please enter the administrator name and email.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
        setLoginError("Please enter a valid official email address.");
        return;
      }
      if (adminPasscode.trim() !== "admin123") {
        setLoginError("Invalid Security Passcode. (Hint: Use 'admin123' for demo access)");
        return;
      }

      setLoginError("");
      const userObj = {
        name: loginName.trim(),
        email: loginEmail.trim(),
        role: "admin" as const
      };

      try {
        localStorage.setItem("community_hero_logged_in_user", JSON.stringify(userObj));
      } catch (err) {
        console.warn("Could not save admin user session:", err);
      }

      setCurrentUser(userObj);
      setActiveTab("admin");
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("community_hero_logged_in_user");
      localStorage.removeItem("citizen_logged_in_user");
    } catch (err) {
      // safe ignore
    }
    setCurrentUser(null);
    setLoginName("");
    setLoginEmail("");
    setAdminPasscode("");
  };

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/issues");
      if (!res.ok) throw new Error("Could not load community report catalog.");
      const data = await res.json();
      setIssues(data);
      setErrorMessage("");
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Image Upload helper converting to Base64
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFormValidationError("Image is too large (max size 8MB is allowed).");
      return;
    }

    setFormValidationError("");
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormImage(base64String);
      setFormImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    if (file.size > 8 * 1024 * 1024) {
      setFormValidationError("Image is too large (max size 8MB is allowed).");
      return;
    }

    setFormValidationError("");
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormImage(base64String);
      setFormImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Preset quick issue options to quickly populate submission form
  const handleQuickLoad = (presetType: "pothole" | "light" | "garbage" | "leak") => {
    setFormValidationError("");
    if (presetType === "pothole") {
      setFormTitle("Dangerous Deep Pothole on Pine Road");
      setFormLocation("220 Pine Road, near City Library");
      setFormDescription("A massive deep pit has formed directly in the pedestrian crosswalk path. Cyclists are constantly hitting it, and children are tripping on it at night.");
      setFormReporterName("Arthur Pendragon");
      setFormImagePreview("https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600");
      setFormImage("https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600");
    } else if (presetType === "light") {
      setFormTitle("Broken Streetlights in Metro Alleyway");
      setFormLocation("Alley behind Oakwood Station");
      setFormDescription("Both street lanterns in the walkway behind the station have gone dark. People feel heavily unsafe walking through here after dusk.");
      setFormReporterName("Sam Wilson");
      setFormImagePreview("https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&q=80&w=600");
      setFormImage("https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&q=80&w=600");
    } else if (presetType === "garbage") {
      setFormTitle("Illegal Debris Dumping in Green Alley");
      setFormLocation("Alley beside Green Corner Grocery, Mid-town");
      setFormDescription("Someone dumped multiple construction wooden pallets, plastic sheets, and general broken pipes blocking the fire exit lane.");
      setFormReporterName("Clara Oswald");
      setFormImagePreview("https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600");
      setFormImage("https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600");
    } else if (presetType === "leak") {
      setFormTitle("Burst Pipe Gushing Clean Water");
      setFormLocation("Intersection of Broad St & Market");
      setFormDescription("Massive pipe leak pushing strong water fountain from the curb. The storm drains are starting to backup with fallen leaves.");
      setFormReporterName("Miles Morales");
      setFormImagePreview("https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&q=80&w=600");
      setFormImage("https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&q=80&w=600");
    }
  };

  // Submit Issue with beautiful AI simulated checklist
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim() || !formLocation.trim()) {
      setFormValidationError("Please fill in the title, description, and location of the incident.");
      return;
    }

    setFormValidationError("");
    setSubmittingWithAI(true);
    setAiStep(0);
    setAiError("");
    setNewlyCreatedId(null);

    // Beautiful step animations for modern design WOW factor
    const steps = [
      () => setAiStep(1), // "Initializing secure server connection..."
      () => setAiStep(2), // "Uploading photo attachments to civic database..."
      () => setAiStep(3), // "Spinning up Gemini 2.5-Flash multimodal agent..."
      () => setAiStep(4), // "Generating automatic classification & severity vectors..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      steps[i]();
    }

    try {
      const res = await fetch("/api/issues", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           title: formTitle,
           description: formDescription,
           location: formLocation,
           imageUrl: formImage,
           reporterName: formReporterName || "Resilient Citizen",
         }),
      });

      if (!res.ok) throw new Error("Civic categorization endpoint failed to complete.");
      
      const newIssue: Issue = await res.json();
      
      await new Promise((resolve) => setTimeout(resolve, 400));
      setAiStep(5); // Completed!
      setNewlyCreatedId(newIssue.id);

      // Mutate local state
      setIssues(prev => [newIssue, ...prev]);

      // Reset Form fields
      setFormTitle("");
      setFormLocation("");
      setFormDescription("");
      setFormReporterName(currentUser?.name || "");
      setFormImage(null);
      setFormImagePreview(null);

    } catch (err: any) {
      setAiError(err.message || "Failed during Gemini processing.");
    }
  };

  // View newly reported issue
  const handleViewNewlyCreated = () => {
    setSubmittingWithAI(false);
    setActiveTab("dashboard");
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedUrgency("All");
  };

  // Verify Issue endpoint handler
  const handleVerify = async (id: string) => {
    try {
      // Optimistic Update
      setIssues(prev => prev.map(issue => {
        if (issue.id === id) {
          const alreadyVerified = issue.verifiedBy.includes(currentUserSession);
          return {
            ...issue,
            verifiedBy: alreadyVerified 
              ? issue.verifiedBy.filter(u => u !== currentUserSession)
              : [...issue.verifiedBy, currentUserSession],
            verificationCount: alreadyVerified
              ? Math.max(0, issue.verificationCount - 1)
              : issue.verificationCount + 1
          };
        }
        return issue;
      }));

      await fetch(`/api/issues/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserSession }),
      });
    } catch (error) {
      console.error("Failed to push verification:", error);
      fetchIssues(); // revert
    }
  };

  // Vote on Urgency
  const handleUrgencyVote = async (id: string, voteType: UrgencyType) => {
    try {
      // Optimistic update local state representation for responsive UI clicks
      setIssues(prev => prev.map(issue => {
        if (issue.id === id) {
          const votedUrgency = issue.votedUrgency || {};
          const currentVote = votedUrgency[currentUserSession];
          const updatedVotes = { ...issue.urgencyVotes };

          let nextVotedUrgency = { ...votedUrgency };
          if (currentVote === voteType) {
            // Unvote
            delete nextVotedUrgency[currentUserSession];
            updatedVotes[voteType] = Math.max(0, (updatedVotes[voteType] || 1) - 1);
          } else {
            // Remove previous vote if any
            if (currentVote) {
              updatedVotes[currentVote] = Math.max(0, (updatedVotes[currentVote] || 1) - 1);
            }
            // Put new vote
            nextVotedUrgency[currentUserSession] = voteType;
            updatedVotes[voteType] = (updatedVotes[voteType] || 0) + 1;
          }

          return {
            ...issue,
            votedUrgency: nextVotedUrgency,
            urgencyVotes: updatedVotes
          };
        }
        return issue;
      }));

      const res = await fetch(`/api/issues/${id}/vote-urgency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: voteType, userId: currentUserSession }),
      });

      if (!res.ok) throw new Error("Voting server error");
      const updatedIssue = await res.json();
      
      // Sync from server response
      setIssues(prev => prev.map(issue => {
        if (issue.id === id) {
          return {
            ...issue,
            urgencyVotes: updatedIssue.urgencyVotes,
            votedUrgency: updatedIssue.votedUrgency || {}
          };
        }
        return issue;
      }));
    } catch (error) {
      console.error("Failed to cast urgency vote:", error);
      fetchIssues(); // Revert on failure
    }
  };

  // Resolve target issue (Toggle between Open/Resolved)
  const handleResolve = async (id: string) => {
    try {
      // Optimistic update
      setIssues(prev => prev.map(issue => {
        if (issue.id === id) {
          return {
            ...issue,
            status: issue.status === "Open" ? "Resolved" : "Open" as any
          };
        }
        return issue;
      }));

      await fetch(`/api/issues/${id}/resolve`, {
        method: "POST"
      });
    } catch (error) {
      console.error("Failed to change status:", error);
      fetchIssues();
    }
  };

  // Update Administrative Progress Step & Proof photos
  const handleProgressChange = async (id: string, step: number, completedImg?: string) => {
    try {
      setIssues(prev => prev.map(issue => {
        if (issue.id === id) {
          return {
            ...issue,
            progressStep: step,
            completedImageUrl: completedImg || (step === 5 ? (issue.completedImageUrl || "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600") : undefined),
            status: step === 5 ? "Resolved" : "Open" as any
          };
        }
        return issue;
      }));

      await fetch(`/api/issues/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressStep: step, completedImageUrl: completedImg })
      });
    } catch (err) {
      console.error("Failed to update progress step:", err);
      fetchIssues();
    }
  };

  // Toggle Citizen feedback rating satisfaction
  const handleSatisfyToggle = async (id: string, satisfied: boolean) => {
    try {
      setIssues(prev => prev.map(issue => {
        if (issue.id === id) {
          return {
            ...issue,
            citizenSatisfied: satisfied
          };
        }
        return issue;
      }));

      await fetch(`/api/issues/${id}/satisfy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citizenSatisfied: satisfied })
      });
    } catch (err) {
      console.error("Failed to cast resolution feedback:", err);
      fetchIssues();
    }
  };

  // Post progress or question comment to an issue
  const handlePostComment = async (issueId: string, content: string) => {
    if (!currentUser) throw new Error("You must be authenticated to comment.");

    const res = await fetch(`/api/issues/${issueId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorName: currentUser.name,
        authorRole: currentUser.role,
        content
      })
    });

    if (!res.ok) {
      throw new Error("Unable to submit comment on this issue.");
    }

    const updatedIssue = await res.json();

    // Update local state issue comments
    setIssues(prev => prev.map(issue => {
      if (issue.id === issueId) {
        return {
          ...issue,
          comments: updatedIssue.comments || []
        };
      }
      return issue;
    }));
  };

  // Filter calculations
  const filteredIssues = issues.filter(issue => {
    // Tab filtering
    if (activeTab === "resolved" && issue.status !== "Resolved") return false;
    if (activeTab === "dashboard" && issue.status !== "Open") return false;

    // Search query matches
    const fieldsText = `${issue.title} ${issue.description} ${issue.location}`.toLowerCase();
    const matchesSearch = fieldsText.includes(searchQuery.toLowerCase());

    // Category match
    const matchesCategory = selectedCategory === "All" || issue.category === selectedCategory;

    // Urgency match
    const matchesUrgency = selectedUrgency === "All" || issue.urgency === selectedUrgency;

    return matchesSearch && matchesCategory && matchesUrgency;
  });

  // Sort calculations specifically for the Administrative Portal
  const sortedAdminIssues = useMemo(() => {
    const list = [...issues];
    if (adminSortType === "priority") {
      // Rank by the total number of people in need of the solution (total citizen urgency votes)
      return list.sort((a, b) => {
        const votesA = a.urgencyVotes || { Low: 0, Medium: 0, High: 0, Critical: 0 };
        const votesB = b.urgencyVotes || { Low: 0, Medium: 0, High: 0, Critical: 0 };
        const totalA = votesA.Low + votesA.Medium + votesA.High + votesA.Critical;
        const totalB = votesB.Low + votesB.Medium + votesB.High + votesB.Critical;
        
        if (totalB === totalA) {
          // If total votes are equal, newer issues first
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return totalB - totalA;
      });
    } else if (adminSortType === "pending") {
      // Pending reviews first (progressStep < 5 first)
      return list.sort((a, b) => {
        const stepA = a.progressStep || 1;
        const stepB = b.progressStep || 1;
        if (stepA === stepB) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return stepA - stepB;
      });
    } else if (adminSortType === "category") {
      return list.sort((a, b) => a.category.localeCompare(b.category));
    }
    return list;
  }, [issues, adminSortType]);

  // Calculate stats based on ALL currently loaded issues
  const departmentWorkload = useMemo(() => {
    const departments = [
      { name: "Public Works Department", color: "bg-amber-500", barColor: "bg-amber-500/80", icon: "🚧" },
      { name: "Sanitation Department", color: "bg-emerald-500", barColor: "bg-emerald-500/80", icon: "🗑️" },
      { name: "Water Department", color: "bg-blue-500", barColor: "bg-blue-500/80", icon: "💧" },
      { name: "Electricity Department", color: "bg-yellow-500", barColor: "bg-yellow-500/80", icon: "💡" },
      { name: "Public Safety Division", color: "bg-rose-500", barColor: "bg-rose-500/80", icon: "🛡️" },
      { name: "Municipal Services Department", color: "bg-purple-500", barColor: "bg-purple-500/80", icon: "🏛️" }
    ];

    return departments.map(dept => {
      const activeCount = issues.filter(issue => {
        const issueDept = issue.aiAnalysis?.estimatedDepartment || "Municipal Services Department";
        return issueDept === dept.name && issue.status !== "Resolved";
      }).length;
      return { ...dept, activeCount };
    });
  }, [issues]);

  const totalIssues = issues.length;
  const openIssuesCount = issues.filter(i => i.status === "Open").length;
  const resolvedIssuesCount = issues.filter(i => i.status === "Resolved").length;
  const highPriorityCount = issues.filter(i => i.status === "Open" && (i.urgency === "High" || i.urgency === "Critical")).length;

  // Helper styling getters
  const getCategoryTheme = (cat: CategoryType) => {
    switch (cat) {
      case "Road Damage": 
        return { bg: "bg-red-50 text-red-700 border-red-100", label: "Road Damage" };
      case "Garbage": 
        return { bg: "bg-amber-50 text-amber-700 border-amber-100", label: "Waste & Garbage" };
      case "Water Leakage": 
        return { bg: "bg-blue-50 text-blue-700 border-blue-100", label: "Water Leakage" };
      case "Street Light": 
        return { bg: "bg-yellow-50 text-yellow-800 border-yellow-200", label: "Street Light" };
      case "Public Safety": 
        return { bg: "bg-purple-50 text-purple-700 border-purple-100", label: "Public Safety" };
      default: 
        return { bg: "bg-neutral-50 text-neutral-600 border-neutral-150", label: "Other Incident" };
    }
  };

  const getUrgencyTheme = (urg: UrgencyType) => {
    switch (urg) {
      case "Critical": 
        return "bg-rose-50 text-rose-700 border border-rose-200 font-bold";
      case "High": 
        return "bg-orange-50 text-orange-700 border border-orange-200 font-medium";
      case "Medium": 
        return "bg-amber-50 text-amber-800 border border-amber-200";
      default: 
        return "bg-slate-50 text-slate-600 border border-slate-200";
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] text-neutral-800 flex flex-col font-sans antialiased">
        {/* Simple Header */}
        <header className="bg-white border-b border-neutral-100 shadow-sm px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
              <Shield className="text-white w-5 h-5 stroke-[2.5]" id="logo-icon" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-neutral-900">
                Community Hero
              </h1>
              <p className="text-[10px] text-neutral-500 font-medium">
                Autonomous Neighborhood Action Hub
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700">
            Secure Entry
          </span>
        </header>

        {/* Beautiful Centered Login Box */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-150 p-8 shadow-sm">
            
            {/* High Polished Dual-Role Switcher Tabs */}
            <div className="flex bg-neutral-100 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setLoginRole("citizen");
                  setLoginError("");
                }}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                  loginRole === "citizen"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
                id="login-citizen-tab"
              >
                1st Citizen Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginRole("admin");
                  setLoginError("");
                }}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all-custom ${
                  loginRole === "admin"
                    ? "bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-950"
                }`}
                id="login-admin-tab"
              >
                2nd Municipal Admin
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-tr from-orange-50 to-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-100/80">
                {loginRole === "citizen" ? (
                  <User className="w-6 h-6 text-orange-600" />
                ) : (
                  <Shield className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                {loginRole === "citizen" ? "Citizen Portal Welcome" : "Administrative Access"}
              </h2>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {loginRole === "citizen" 
                  ? "Connect with your neighborhood, report local problems, and track real-time dispatch responses. No password required." 
                  : "Municipal administration command suite. Advance task steps, monitor community priority consensus, and upload completed works."}
              </p>
            </div>

            {loginError && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wide">
                  {loginRole === "citizen" ? "Your Full Name" : "Admin Name / Call Sign"}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder={loginRole === "citizen" ? "e.g. Samuel L. Citizen" : "e.g. Officer Ramos"}
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wide">
                  {loginRole === "citizen" ? "Your Email Address" : "Official Government Email"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <input
                    type="email"
                    placeholder={loginRole === "citizen" ? "e.g. sam@example.com" : "e.g. ramos@city.gov"}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                  />
                </div>
              </div>

              {loginRole === "admin" && (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wide">
                      Security Passcode
                    </label>
                    <span className="text-[10px] text-orange-600 font-extrabold bg-orange-50 px-1.5 py-0.5 rounded">
                      Demo key: admin123
                    </span>
                  </div>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <input
                      type="password"
                      placeholder="Enter security key..."
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white py-3 rounded-xl text-xs font-bold tracking-wide transition shadow-md shadow-orange-500/15 active:scale-[0.98]"
              >
                {loginRole === "citizen" ? "Enter Civic Dashboard" : "Authorize Admin Command"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-neutral-100 text-center text-[11px] text-neutral-400 font-medium">
              Authentication details are stored securely on this browser session.
            </div>
          </div>
        </div>

        {/* Simple Footer */}
        <footer className="bg-white border-t border-neutral-100 py-4 px-4 sm:px-8 text-center text-xs text-neutral-400">
          Community Hero — Designed to build safer, smarter cities.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-neutral-800 flex flex-col font-sans antialiased">
      
      {/* GLOWING HEADER NAVBAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-100 shadow-sm px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/10">
            <Shield className="text-white w-5 h-5 stroke-[2.5]" id="logo-icon" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900" id="app-title">
                Community Hero
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700">
                AI Agent Route Active
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 font-medium">
              Smart Citizen Action & Neighborhood Response
            </p>
          </div>
        </div>

        {/* DYNAMIC NAVIGATION AND RIGHT-SHIFTED CITIZEN PROFILE */}
        <div className="flex flex-col sm:flex-row items-center gap-4 ml-auto w-full md:w-auto justify-between md:justify-end">
          
          <nav className="flex items-center bg-neutral-100/80 p-1 rounded-xl order-2 md:order-1">
            {currentUser.role === "admin" ? (
              <>
                <button 
                  onClick={() => { setActiveTab("admin"); setErrorMessage(""); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    activeTab === "admin" 
                      ? "bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-sm" 
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                  id="nav-admin-portal"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Portal</span>
                </button>
                <button 
                  onClick={() => { setActiveTab("dashboard"); setErrorMessage(""); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "dashboard" 
                      ? "bg-white text-neutral-900 shadow-sm" 
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                  id="nav-admin-monitor"
                >
                  Incident Monitor
                </button>
                <button 
                  onClick={() => { setActiveTab("resolved"); setErrorMessage(""); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "resolved" 
                      ? "bg-white text-neutral-900 shadow-sm" 
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                  id="nav-admin-audit"
                >
                  Resolved Auditing
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => { setActiveTab("dashboard"); setErrorMessage(""); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "dashboard" 
                      ? "bg-white text-neutral-900 shadow-sm" 
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                  id="nav-citizen-dashboard"
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => { setActiveTab("report"); setErrorMessage(""); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "report" 
                      ? "bg-white text-neutral-900 shadow-sm" 
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                  id="nav-citizen-report"
                >
                  Report Incident
                </button>
                <button 
                  onClick={() => { setActiveTab("resolved"); setErrorMessage(""); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "resolved" 
                      ? "bg-white text-neutral-900 shadow-sm" 
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                  id="nav-citizen-resolved"
                >
                  Resolved ({resolvedIssuesCount})
                </button>
              </>
            )}
          </nav>

          {/* ACTIVE USER SESSION BADGE ACCURATELY PLACED IN THE FAR TOP RIGHT CORNER */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 order-1 md:order-2 ml-auto sm:ml-0 shadow-sm">
            <div className={`w-6 h-6 rounded-lg text-white flex items-center justify-center text-[10px] font-bold uppercase shrink-0 ${
              currentUser.role === "admin" ? "bg-slate-800" : "bg-orange-500"
            }`}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="leading-tight">
              <span className={`font-medium text-[8px] block uppercase ${
                currentUser.role === "admin" ? "text-amber-600 font-extrabold" : "text-neutral-400"
              }`}>
                {currentUser.role === "admin" ? "Admin Profile" : "Citizen Profile"}
              </span>
              <span className="text-neutral-950 font-extrabold max-w-[80px] truncate block">{currentUser.name}</span>
            </div>
            <button 
              onClick={handleLogout}
              title="Sign Out"
              className="ml-1 p-1 hover:bg-neutral-200/60 rounded-md text-neutral-400 hover:text-rose-600 transition shrink-0"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>

        </div>
      </header>

      {/* DASHBOARD STATS BENTO PANEL */}
      <section className="px-4 sm:px-8 py-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-neutral-150 p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-neutral-50 rounded-xl text-neutral-500">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-400 block mb-0.5 uppercase tracking-wider">Total Cataloged</span>
              <span className="text-3xl font-extrabold text-neutral-900">{totalIssues}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-neutral-150 p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-400 block mb-0.5 uppercase tracking-wider">Active Response</span>
              <span className="text-3xl font-extrabold text-blue-600">{openIssuesCount}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-150 p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-400 block mb-0.5 uppercase tracking-wider">Fully Resolved</span>
              <span className="text-3xl font-extrabold text-emerald-600">{resolvedIssuesCount}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-amber-500 rounded-2xl p-5 shadow-md shadow-orange-500/5 flex items-center gap-4 text-white">
            <div className="p-3 bg-white/10 rounded-xl text-white">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white/80 block mb-0.5 uppercase tracking-wider">Urgent Focus</span>
              <span className="text-3xl font-extrabold">{highPriorityCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <main className="flex-1 px-4 sm:px-8 py-2 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {loading && issues.length === 0 ? (
          <div className="text-center py-24 flex-1 flex flex-col justify-center items-center bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-orange-600 mb-4" />
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Loading civic incident index...</p>
          </div>
        ) : errorMessage ? (
          <div className="bg-white border border-red-100 rounded-2xl p-8 text-center max-w-md mx-auto my-12 shadow-md">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">Incidents Registry Error</h3>
            <p className="text-sm mt-2 text-neutral-500 leading-relaxed">{errorMessage}</p>
            <button 
              onClick={fetchIssues}
              className="mt-6 w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-orange-500/10"
            >
              Retry Database Connection
            </button>
          </div>
        ) : (
          <>
            {/* TAB 1 & 3: MAIN LISTING FEED */}
            {(activeTab === "dashboard" || activeTab === "resolved") && (
              <div className="flex-1 flex flex-col lg:flex-row gap-6 w-full">
                
                {/* FEED COLUMN */}
                <div className="flex-1 flex flex-col gap-5">
                  
                  {/* Beautiful user welcoming greeting */}
                  {currentUser && (
                    currentUser.role === "admin" ? (
                      <div className="p-4 bg-gradient-to-r from-slate-905/10 to-amber-500/5 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                            {currentUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h2 className="text-sm font-black text-neutral-900">
                              System Portal Active: {currentUser.name}
                            </h2>
                            <p className="text-[11px] text-neutral-500 font-medium">
                              Municipal Official Email: <span className="font-semibold text-neutral-700">{currentUser.email}</span>
                            </p>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <Shield className="w-3.5 h-3.5 text-amber-600 animate-pulse animate-duration-1000" />
                          <span>Authorized Admin Mode</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/15 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-orange-500/10">
                            {currentUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h2 className="text-sm font-bold text-neutral-900">
                              Welcome back, {currentUser.name}!
                            </h2>
                            <p className="text-[11px] text-neutral-500 font-medium">
                              Citizen Email: <span className="font-semibold text-neutral-600">{currentUser.email}</span>
                            </p>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100/60 px-2.5 py-1 rounded-lg border border-orange-200/40">
                          <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse text-orange-600" />
                          <span>Active Civic Contributor</span>
                        </div>
                      </div>
                    )
                  )}
                  
                  {/* Modern Onboarding Guide */}
                  <div className="bg-gradient-to-br from-indigo-50/30 via-white to-white border border-indigo-100 rounded-2xl p-5 shadow-xs transition-all duration-300">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                          <Info className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                            💡 Autonomous Civic Intelligence — How It Works
                          </h3>
                          <p className="text-[11px] text-neutral-500 font-medium leading-normal">
                            Learn how neighborhood complaints are triaged, routed, and resolved using Gemini 3.5 AI.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowGuide(!showGuide)}
                        className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-[10.5px] font-bold rounded-lg text-neutral-600 transition shrink-0"
                      >
                        {showGuide ? "Hide Guide" : "Show Guide"}
                      </button>
                    </div>

                    {showGuide && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-indigo-50/70">
                        <div className="p-3.5 bg-neutral-50/50 border border-neutral-100 rounded-xl relative">
                          <span className="absolute top-2 right-3 text-lg font-black text-neutral-200/70">01</span>
                          <span className="text-[9.5px] font-black text-orange-600 uppercase tracking-wider block mb-1">Citizen File</span>
                          <h4 className="text-xs font-black text-neutral-800 mb-1">Report Problem</h4>
                          <p className="text-[10.5px] text-neutral-500 leading-normal">
                            Submit reports with location coordinates and photo evidence of potholes, water leaks, or dark lights.
                          </p>
                        </div>

                        <div className="p-3.5 bg-indigo-50/30 border border-indigo-100/30 rounded-xl relative">
                          <span className="absolute top-2 right-3 text-lg font-black text-indigo-200/30">02</span>
                          <span className="text-[9.5px] font-black text-indigo-600 uppercase tracking-wider block mb-1">AI Triage</span>
                          <h4 className="text-xs font-black text-neutral-800 mb-1">Gemini Routing</h4>
                          <p className="text-[10.5px] text-neutral-500 leading-normal">
                            Gemini instantly maps category, assigns routing to municipal departments, and suggests action plans.
                          </p>
                        </div>

                        <div className="p-3.5 bg-amber-50/30 border border-amber-100/30 rounded-xl relative">
                          <span className="absolute top-2 right-3 text-lg font-black text-amber-200/30">03</span>
                          <span className="text-[9.5px] font-black text-amber-600 uppercase tracking-wider block mb-1">Consensus</span>
                          <h4 className="text-xs font-black text-neutral-800 mb-1">Urgency Voting</h4>
                          <p className="text-[10.5px] text-neutral-500 leading-normal">
                            Neighbors vote on urgency priority levels to help state officials track critical infrastructure gaps.
                          </p>
                        </div>

                        <div className="p-3.5 bg-emerald-50/30 border border-emerald-100/30 rounded-xl relative">
                          <span className="absolute top-2 right-3 text-lg font-black text-emerald-200/30">04</span>
                          <span className="text-[9.5px] font-black text-emerald-600 uppercase tracking-wider block mb-1">Resolution</span>
                          <h4 className="text-xs font-black text-neutral-800 mb-1">Proof Verified</h4>
                          <p className="text-[10.5px] text-neutral-500 leading-normal">
                            Crews resolve the issue, upload after-photos, and prompt citizens to verify satisfaction.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Modern Filter Ribbon */}
                  <div className="p-4 rounded-2xl bg-white border border-neutral-150 shadow-sm flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold text-neutral-800">
                        {activeTab === "resolved" ? "Archive of Resolved Matters" : "Active Neighborhood Watch"}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-600">
                        {filteredIssues.length} active
                      </span>
                    </div>

                    {/* Filter controls panel */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search addresses, titles..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                        />
                      </div>

                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as any)}
                        className="bg-neutral-50 border border-neutral-200 text-xs font-bold py-2 px-3 rounded-xl focus:bg-white outline-none cursor-pointer transition"
                      >
                        <option value="All">All Categories</option>
                        <option value="Road Damage">Road Damage</option>
                        <option value="Garbage">Garbage Issues</option>
                        <option value="Water Leakage">Water Leaks</option>
                        <option value="Street Light">Street Lights</option>
                        <option value="Public Safety">Public Safety</option>
                        <option value="Other">Other Issues</option>
                      </select>

                      <select
                        value={selectedUrgency}
                        onChange={(e) => setSelectedUrgency(e.target.value as any)}
                        className="bg-neutral-50 border border-neutral-200 text-xs font-bold py-2 px-3 rounded-xl focus:bg-white outline-none cursor-pointer transition"
                      >
                        <option value="All">All Urgency</option>
                        <option value="Low">Low Priority</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High Priority</option>
                        <option value="Critical">Critical</option>
                      </select>

                      {(searchQuery || selectedCategory !== "All" || selectedUrgency !== "All") && (
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("All");
                            setSelectedUrgency("All");
                          }}
                          className="p-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-[10px] font-bold"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </div>                  {/* Incident Feed Items */}
                  {filteredIssues.length === 0 ? (
                    <div className="p-12 text-center bg-white border border-neutral-150 rounded-2xl shadow-sm max-w-lg mx-auto w-full my-6">
                      <HelpCircle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                      <h3 className="text-base font-bold text-neutral-800">No reported issues found</h3>
                      <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                        There are no open or matching reported matters in this category filters index right now.
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategory("All");
                          setSelectedUrgency("All");
                        }}
                        className="mt-5 px-4 py-2 rounded-xl text-neutral-700 bg-neutral-100 hover:bg-neutral-200 text-xs font-bold transition"
                      >
                        Clear Active Filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredIssues.map((issue) => {
                        const votes = issue.urgencyVotes || { Low: 0, Medium: 0, High: 0, Critical: 0 };
                        const totalVotes = votes.Low + votes.Medium + votes.High + votes.Critical;
                        const scoreValues = { Low: 1, Medium: 2, High: 3, Critical: 4 };
                        const totalWeighted = (votes.Low * scoreValues.Low) + 
                                              (votes.Medium * scoreValues.Medium) + 
                                              (votes.High * scoreValues.High) + 
                                              (votes.Critical * scoreValues.Critical);
                        const averageScore = totalVotes > 0 ? (totalWeighted / totalVotes) : 0;
                        
                        let communityIndexLabel = "Community Review";
                        let communityColorClasses = "bg-neutral-50 text-neutral-500 border-neutral-200";
                        if (averageScore > 3.25) { 
                          communityIndexLabel = "CRITICAL PRIORITY TARGET"; 
                          communityColorClasses = "bg-red-50 text-red-700 border-red-200 font-bold"; 
                        } else if (averageScore > 2.5) { 
                          communityIndexLabel = "HIGH ALERT VOTE"; 
                          communityColorClasses = "bg-orange-50 text-orange-700 border-orange-200 font-bold"; 
                        } else if (averageScore > 1.7) { 
                          communityIndexLabel = "MODERATE INCIDENT"; 
                          communityColorClasses = "bg-amber-50 text-amber-800 border-amber-200 font-bold"; 
                        } else if (averageScore > 0) { 
                          communityIndexLabel = "LOW DEVIATION REPORT"; 
                          communityColorClasses = "bg-blue-50 text-blue-700 border-blue-200 font-medium"; 
                        }

                        const userHasVerified = issue.verifiedBy.includes(currentUserSession);
                        const catDetail = getCategoryTheme(issue.category);

                        return (
                          <div 
                            key={issue.id}
                            className="bg-white border border-neutral-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
                            id={`issue-${issue.id}`}
                          >
                            
                            {/* Layout Grid */}
                            <div className="flex flex-col md:flex-row gap-5">
                              
                              {/* Left side, visual thumbnail before/after gallery structure */}
                              {issue.imageUrl && (
                                <div className="flex flex-wrap gap-3 shrink-0">
                                  {/* Before Image */}
                                  <div className="w-full sm:w-44 h-32 rounded-xl border border-neutral-200 bg-neutral-50 shrink-0 overflow-hidden relative shadow-sm">
                                    <img
                                      src={issue.imageUrl}
                                      alt="Original condition reported by citizen"
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 left-2 py-0.5 px-2 bg-neutral-900/90 text-white rounded text-[8px] font-black tracking-wider uppercase">
                                      BEFORE
                                    </div>
                                    <div className="absolute bottom-2 right-2 py-0.5 px-2 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-bold text-white tracking-wide uppercase">
                                      {issue.status === "Resolved" ? "RESOLVED" : "ACTIVE"}
                                    </div>
                                  </div>

                                  {/* After Image / Proof of Completion */}
                                  {issue.completedImageUrl && (
                                    <div className="w-full sm:w-44 h-32 rounded-xl border border-green-200 bg-green-50 shrink-0 overflow-hidden relative shadow-sm animate-fade-in">
                                      <img
                                        src={issue.completedImageUrl}
                                        alt="Resolution verified by administration"
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute top-2 left-2 py-0.5 px-2 bg-green-700 text-white rounded text-[8px] font-black tracking-wider uppercase shadow-sm">
                                        AFTER
                                      </div>
                                      <div className="absolute bottom-2 right-2 py-0.5 px-2 bg-green-950 text-white rounded-full text-[8px] font-black tracking-wider uppercase">
                                        RESOLVED PROOF
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Right description details */}
                              <div className="flex-1 flex flex-col justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${catDetail.bg}`}>
                                      {catDetail.label}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getUrgencyTheme(issue.urgency)}`}>
                                      AI Assigned: {issue.urgency}
                                    </span>
                                    <span className="text-[11px] text-neutral-400 font-semibold ml-auto">
                                      {new Date(issue.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>

                                  <h3 className="text-lg font-bold text-neutral-900 mb-1 leading-snug flex items-center gap-2">
                                    {issue.title}
                                    {issue.citizenSatisfied && (
                                      <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                                        ★ Citizen Satisfied
                                      </span>
                                    )}
                                  </h3>
                                  <p className="text-xs text-neutral-500 mb-3.5 leading-relaxed">
                                    {issue.description}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-50">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span>{issue.location}</span>
                                  </div>
                                  <div className="text-[11px] font-bold text-neutral-400">
                                    Reported by: <span className="text-neutral-600 font-bold">{issue.reporterName}</span>
                                  </div>
                                </div>
                              </div>

                            </div>

                            {/* Intelligent Copilot reasoning panel (if available) */}
                            {issue.aiAnalysis && (
                              <div className="mt-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/10 relative">
                                <div className="absolute top-0 right-3 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                  <Sparkles className="w-2.5 h-2.5 fill-current" />
                                  Gemini Civic Intelligence
                                </div>
                                <div className="space-y-3 pt-1">
                                  <p className="text-xs text-neutral-600 italic leading-relaxed">
                                    &ldquo;{issue.aiAnalysis.reason}&rdquo;
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5 pt-3 border-t border-indigo-50">
                                    {issue.aiAnalysis.suggestedAction && (
                                      <div className="p-2.5 rounded-lg bg-white/80 border border-neutral-100">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">Suggested Action Plan</span>
                                        <span className="text-[11px] font-bold text-neutral-800 leading-snug">{issue.aiAnalysis.suggestedAction}</span>
                                      </div>
                                    )}
                                    {issue.aiAnalysis.estimatedDepartment && (
                                      <div className="p-2.5 rounded-lg bg-white/80 border border-neutral-100">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">Estimated Department Routing</span>
                                        <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                          🏛️ {issue.aiAnalysis.estimatedDepartment}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Reviewed Progress Status Bar - Fills step by step */}
                            <div className="mt-4 p-4 rounded-xl bg-neutral-50 border border-neutral-150">
                              <div className="flex items-center justify-between mb-2 header-nav">
                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                                  Reviewed Dispatch & Action Roadmap
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-neutral-200 text-neutral-800 tracking-wider">
                                  {
                                    (issue.progressStep || 1) === 1 ? "Step 1: Submitted" :
                                    (issue.progressStep || 1) === 2 ? "Step 2: Under Review" :
                                    (issue.progressStep || 1) === 3 ? "Step 3: Accepted" :
                                    (issue.progressStep || 1) === 4 ? "Step 4: Active Work" :
                                    "Step 5: Completed & Resolved"
                                  }
                                </span>
                              </div>

                              <div className="relative mt-4 mb-2 px-1">
                                {/* Base line gray */}
                                <div className="absolute left-3 right-3 top-2.5 h-1 bg-neutral-200 rounded-full" />
                                {/* Filled colored line */}
                                <div 
                                  className="absolute left-3 top-2.5 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-emerald-600 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(96, Math.max(0, ((issue.progressStep || 1) - 1) * 24))}%` }}
                                />

                                <div className="relative flex justify-between">
                                  {[1, 2, 3, 4, 5].map((st) => {
                                    const active = (issue.progressStep || 1) === st;
                                    const passed = (issue.progressStep || 1) >= st;
                                    
                                    let nodeColors = "bg-white border-neutral-300 text-neutral-400";
                                    if (passed) {
                                      if (st === 5) nodeColors = "bg-emerald-600 border-emerald-600 text-white font-extrabold";
                                      else if (st === 4) nodeColors = "bg-amber-500 border-amber-500 text-white font-extrabold";
                                      else if (st === 3) nodeColors = "bg-orange-500 border-orange-500 text-white font-extrabold";
                                      else nodeColors = "bg-neutral-800 border-neutral-800 text-white font-bold";
                                    }
                                    if (active) {
                                      nodeColors += " ring-4 ring-orange-500/30 scale-110";
                                    }

                                    const captions = {
                                      1: "Submitted",
                                      2: "Reviewing",
                                      3: "Accepted",
                                      4: "Active Work",
                                      5: "Completed"
                                    };

                                    return (
                                      <div key={st} className="flex flex-col items-center">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] transition-all duration-300 ${nodeColors}`}>
                                          {passed && st < (issue.progressStep || 1) ? "✓" : st}
                                        </div>
                                        <span className={`text-[9px] font-bold mt-1.5 tracking-tight ${active ? "text-neutral-900 font-extrabold" : "text-neutral-400 font-medium"}`}>
                                          {captions[st as keyof typeof captions]}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Citizen resolution feedback checklist task */}
                            {issue.status === "Resolved" && currentUser.role === "citizen" && (
                              <div className="mt-4 p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                                <div>
                                  <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-current" />
                                    Community Satisfaction Task
                                  </h4>
                                  <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                                    The municipality has resolved this request! Please confirm if you are satisfied.
                                  </p>
                                </div>

                                <div className="shrink-0">
                                  {issue.citizenSatisfied ? (
                                    <div className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-sm">
                                      <span>★ Fully Satisfied !</span>
                                      <button 
                                        onClick={() => handleSatisfyToggle(issue.id, false)}
                                        className="underline text-[10px] opacity-80 hover:opacity-100 ml-1.5 font-bold"
                                      >
                                        Change
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleSatisfyToggle(issue.id, true)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-all shadow-sm shadow-emerald-600/10 active:scale-95"
                                    >
                                      Mark Satisfied ✓
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Interactive Voting action ribbon */}
                            <div className="mt-4 pt-3.5 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className={`text-[10px] uppercase font-extrabold border px-2.5 py-1.5 rounded-xl ${communityColorClasses}`}>
                                    🚀 Resolved Priority: {communityIndexLabel} ({totalVotes} active citizen votes)
                                  </span>
                                </div>
                              </div>

                              {/* Target buttons control resolution (Only Admins are authorized) */}
                              {currentUser.role === "admin" && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleResolve(issue.id)}
                                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white tracking-wide transition shadow-sm"
                                  >
                                    {issue.status === "Resolved" ? "Re-open Case" : "Force Mark Resolved"}
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Color-graded urgency assessment buttons (graded from yellow to bright red) */}
                            <div className="mt-3.5 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                              <p className="text-[10px] font-black text-neutral-400 uppercase mb-2 tracking-wide block">
                                Vote for safety Urgency Needed to Resolve:
                              </p>
                              <div className="grid grid-cols-4 gap-2">
                                {((["Low", "Medium", "High", "Critical"] as UrgencyType[])).map((lvl) => {
                                  const userActiveVote = issue.votedUrgency?.[currentUserSession || ""];
                                  const isActive = userActiveVote === lvl;

                                  const activeLevelStyles = isActive
                                    ? "ring-2 ring-neutral-900 ring-offset-2 scale-102 opacity-100 font-extrabold shadow-sm"
                                    : "opacity-75 hover:opacity-100 grayscale-[25%] hover:grayscale-0";

                                  const cColors = {
                                    Low: "bg-amber-100 border-amber-200 text-amber-800 hover:bg-amber-200",
                                    Medium: "bg-orange-100 border-orange-200 text-orange-850 hover:bg-orange-200",
                                    High: "bg-red-100 border-red-200 text-red-700 hover:bg-red-200 font-extrabold",
                                    Critical: "bg-rose-600 border-rose-600 text-white hover:bg-rose-700 font-bold"
                                  };

                                  return (
                                    <button
                                      key={lvl}
                                      onClick={() => handleUrgencyVote(issue.id, lvl)}
                                      className={`py-2 px-1 border rounded-lg text-[10.5px] text-center transition-all ${cColors[lvl]} ${activeLevelStyles}`}
                                    >
                                      {lvl}: {issue.urgencyVotes?.[lvl] || 0} {isActive ? "✓" : ""}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[9px] text-neutral-400 font-medium mt-1.5 leading-tight italic">
                                * Your vote represents your active interest in resolving this incident. Click a level to vote or change your score, click again to remove.
                              </p>
                            </div>

                            {/* Citizen Feed Comments Thread */}
                            <IssueComments 
                              issue={issue}
                              currentUser={currentUser}
                              onPostComment={handlePostComment}
                              containerId={`comments-citizen-${issue.id}`}
                            />

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

                {/* RIGHT SIDEBAR PRESENTS & EXPLANATIONS */}
                <aside className="w-full lg:w-80 space-y-5 flex-shrink-0">
                  {/* Department Workload Division Queue */}
                  <div className="bg-white rounded-2xl border border-neutral-150 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                      <h3 className="text-sm font-black text-neutral-900">Routed Department Queues</h3>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-normal mb-4">
                      Pending cases automatically classified and assigned to official municipal divisions:
                    </p>
                    
                    <div className="space-y-3.5">
                      {departmentWorkload.map((dept) => {
                        const maxCount = Math.max(...departmentWorkload.map(d => d.activeCount), 1);
                        const widthPercentage = (dept.activeCount / maxCount) * 100;
                        
                        return (
                          <div key={dept.name} className="space-y-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-bold text-neutral-800 flex items-center gap-1.5 truncate">
                                <span className="shrink-0">{dept.icon}</span>
                                <span className="truncate" title={dept.name}>{dept.name.replace(" Department", "").replace(" Division", "")}</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
                                dept.activeCount > 0 ? "bg-indigo-50 text-indigo-700 border border-indigo-100 animate-pulse animate-duration-3000" : "bg-neutral-50 text-neutral-400"
                              }`}>
                                {dept.activeCount} open
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${dept.barColor} transition-all duration-500 rounded-full`}
                                style={{ width: `${dept.activeCount > 0 ? Math.max(8, widthPercentage) : 0}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-neutral-150 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                      <h3 className="text-base font-bold text-neutral-800">Quick-Report Sandbox</h3>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Select one of the incident presets below to instantly preview mock parameters before executing Gemini automated model routing:
                    </p>
                    
                    {/* Presets Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => { handleQuickLoad("pothole"); setActiveTab("report"); }}
                        className="bg-neutral-50 hover:bg-red-50/50 hover:border-red-200 border border-neutral-200 rounded-xl p-2.5 text-left transition active:scale-95 duration-200 group"
                      >
                        <span className="text-[9px] font-black block text-red-600 uppercase mb-0.5 tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-600 rounded-full inline-block group-hover:animate-ping shrink-0" />
                          Road Damage
                        </span>
                        <span className="text-xs font-extrabold text-neutral-850 truncate block">🚧 Deep Road Pit</span>
                      </button>
                      <button
                        onClick={() => { handleQuickLoad("garbage"); setActiveTab("report"); }}
                        className="bg-neutral-50 hover:bg-emerald-50/50 hover:border-emerald-200 border border-neutral-200 rounded-xl p-2.5 text-left transition active:scale-95 duration-200 group"
                      >
                        <span className="text-[9px] font-black block text-emerald-600 uppercase mb-0.5 tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full inline-block group-hover:animate-ping shrink-0" />
                          Garbage
                        </span>
                        <span className="text-xs font-extrabold text-neutral-850 truncate block">🗑️ Illegal Dump</span>
                      </button>
                      <button
                        onClick={() => { handleQuickLoad("leak"); setActiveTab("report"); }}
                        className="bg-neutral-50 hover:bg-blue-50/50 hover:border-blue-200 border border-neutral-200 rounded-xl p-2.5 text-left transition active:scale-95 duration-200 group"
                      >
                        <span className="text-[9px] font-black block text-blue-600 uppercase mb-0.5 tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full inline-block group-hover:animate-ping shrink-0" />
                          Water Leak
                        </span>
                        <span className="text-xs font-extrabold text-neutral-850 truncate block">💧 Burst Pipe</span>
                      </button>
                      <button
                        onClick={() => { handleQuickLoad("light"); setActiveTab("report"); }}
                        className="bg-neutral-50 hover:bg-amber-50/50 hover:border-amber-200 border border-neutral-200 rounded-xl p-2.5 text-left transition active:scale-95 duration-200 group"
                      >
                        <span className="text-[9px] font-black block text-amber-600 uppercase mb-0.5 tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block group-hover:animate-ping shrink-0" />
                          Street Light
                        </span>
                        <span className="text-xs font-extrabold text-neutral-850 truncate block">💡 Dark Alleyway</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-tr from-neutral-900 to-neutral-800 rounded-2xl p-6 text-white shadow-md">
                    <span className="text-[9px] font-bold uppercase tracking-wider block mb-1 text-orange-400">Autonomous Civic Dispatch</span>
                    <p className="text-xs font-medium leading-relaxed text-neutral-300">
                      When a citizen registers a new report, the Gemini AI Multimodal model instantly reviews coordinates, imagery, and labels to auto-assign priority classifications. High priority issues are categorized to secure instant attention.
                    </p>
                  </div>
                </aside>

              </div>
            )}

            {/* TAB 2: REGISTER INCIDENT REPORT FORM PAGE */}
            {activeTab === "report" && (
              <div className="w-full max-w-2xl mx-auto py-4">
                <div className="bg-white border border-neutral-150 rounded-2xl p-6 md:p-8 shadow-sm">
                  
                  <div className="mb-6 pb-5 border-b border-neutral-100">
                    <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                       Report Neighborhood Incident
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">
                      Give descriptive street and details to allow Gemini AI to accurately routing emergency classifications.
                    </p>
                  </div>

                  {/* Form Preset quick load recommendation bar */}
                  <div className="mb-6 p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                    <p className="text-xs font-bold text-yellow-800 block mb-2.5">
                      Demo presets - Click one to auto-fill the form instantly:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickLoad("pothole")}
                        className="bg-white hover:bg-yellow-100/50 border border-yellow-200 rounded-lg p-2 text-left transition"
                      >
                        <span className="text-[9px] font-bold uppercase text-red-600 block">Pothole</span>
                        <span className="text-[11px] font-medium text-neutral-600 truncate block">Deep Road Pit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLoad("garbage")}
                        className="bg-white hover:bg-yellow-100/50 border border-yellow-200 rounded-lg p-2 text-left transition"
                      >
                        <span className="text-[9px] font-bold uppercase text-amber-600 block">Garbage</span>
                        <span className="text-[11px] font-medium text-neutral-600 truncate block">Illegal Waste</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLoad("leak")}
                        className="bg-white hover:bg-yellow-100/50 border border-yellow-200 rounded-lg p-2 text-left transition"
                      >
                        <span className="text-[9px] font-bold uppercase text-blue-600 block">Water Leak</span>
                        <span className="text-[11px] font-medium text-neutral-600 truncate block">Pipe Gush</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLoad("light")}
                        className="bg-white hover:bg-yellow-100/50 border border-yellow-200 rounded-lg p-2 text-left transition"
                      >
                        <span className="text-[9px] font-bold uppercase text-yellow-600 block">Light Out</span>
                        <span className="text-[11px] font-medium text-neutral-600 truncate block">Dark Alley</span>
                      </button>
                    </div>
                  </div>

                  {formValidationError && (
                    <div className="mb-6 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{formValidationError}</span>
                    </div>
                  )}

                  <form onSubmit={handleFormSubmit} className="space-y-5">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                          Reporter Alias / Name
                        </label>
                        <input
                          type="text"
                          placeholder="Arthur, Neighbor"
                          value={formReporterName}
                          onChange={(e) => setFormReporterName(e.target.value)}
                          className="w-full p-2.5 bg-neutral-50/50 border border-neutral-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                          Problem Headline / Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Dangerously blocking branch"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          required
                          className="w-full p-2.5 bg-neutral-50/50 border border-neutral-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                        Incident Street Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 520 Maple Leaf Ave, Central Downtown"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        required
                        className="w-full p-2.5 bg-neutral-50/50 border border-neutral-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                        Detailed Problem Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Give details. Our integrated Gemini AI model analyzes this description to categorize the incident category and assess hazard priorities."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        required
                        className="w-full p-2.5 bg-neutral-50/50 border border-neutral-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none transition"
                      />
                    </div>

                    {/* Drag-drop or Select Attached image section */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                        Upload Attached Image Proof (Highly Recommended)
                      </label>
                      <div 
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={triggerFileUpload}
                        className="border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50 hover:bg-neutral-50/85 hover:border-neutral-300 flex flex-col items-center justify-center text-center cursor-pointer p-6 transition"
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageChange}
                          accept="image/*"
                          className="hidden"
                        />

                        {formImagePreview ? (
                          <div className="relative max-w-xs mx-auto rounded-xl overflow-hidden border border-neutral-200">
                            <img
                              src={formImagePreview}
                              alt="Uploaded preview details"
                              referrerPolicy="no-referrer"
                              className="w-full h-32 object-cover"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormImage(null);
                                setFormImagePreview(null);
                              }}
                              className="absolute top-1.5 right-1.5 bg-black/75 hover:bg-black text-white px-2 py-0.5 text-[9px] rounded-full font-bold uppercase transition"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="py-2 flex flex-col items-center justify-center text-center">
                            <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                            <span className="text-xs font-bold text-neutral-600 block">Select proof image</span>
                            <span className="text-[10px] text-neutral-400 mt-0.5 block font-semibold">Drag and drop file here or click to browse</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3.5 flex justify-between items-center border-t border-neutral-100">
                      <p className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                        Safe Encrypted Connection Active
                      </p>
                      
                      <button
                        type="submit"
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-orange-500/10 active:scale-95"
                      >
                        Analyze & Dispatch Report
                      </button>
                    </div>

                  </form>

                </div>
              </div>
            )}

            {/* TAB 4: MUNICIPAL ADMIN PORTAL - RESOLVES PROBLEM OF THE CITIZENS */}
            {activeTab === "admin" && currentUser.role === "admin" && (
              <div className="w-full flex flex-col lg:flex-row gap-6 py-4 animate-fade-in">
                
                {/* Admin Feed Area */}
                <div className="flex-1 flex flex-col gap-6">
                  
                  {/* Admin Welcome & Filter Banner */}
                  <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-5 h-5 text-orange-400 stroke-[2.5]" />
                        <h2 className="text-xl font-black tracking-tight" id="admin-header-title">Municipal Response Central</h2>
                      </div>
                      <p className="text-xs text-neutral-300">
                        Admin Mode: Categorize cases, advance roadmaps, upload resolved proofs, and address community priority votes.
                      </p>
                    </div>

                    <div className="flex items-center bg-white/10 p-1.5 rounded-xl self-start md:self-auto">
                      <span className="text-[10px] font-bold uppercase px-2.5 text-neutral-300">Sort Task Priority:</span>
                      <select
                        value={adminSortType}
                        onChange={(e) => setAdminSortType(e.target.value as any)}
                        className="bg-transparent text-white font-extrabold text-xs outline-none cursor-pointer border-none py-0.5 px-2 font-sans font-sans [&>option]:text-neutral-900"
                      >
                        <option value="priority" className="text-neutral-900 font-bold">Highest Citizen Votes</option>
                        <option value="pending" className="text-neutral-900 font-bold">Pending Steps first</option>
                        <option value="category" className="text-neutral-900 font-bold">By Category Group</option>
                      </select>
                    </div>
                  </div>

                  {/* Listings loop */}
                  <div className="space-y-4">
                    {sortedAdminIssues.map((issue, idx) => {
                      const votes = issue.urgencyVotes || { Low: 0, Medium: 0, High: 0, Critical: 0 };
                      const totalVotes = votes.Low + votes.Medium + votes.High + votes.Critical;

                      return (
                        <div 
                          key={issue.id} 
                          className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                            issue.status === "Resolved" ? "border-green-150 bg-green-50/10" : "border-neutral-150"
                          }`}
                          id={`admin-issue-${issue.id}`}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 mb-4">
                            <div>
                              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">CASE REFERENCE</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-neutral-800">#{issue.id}</span>
                                {adminSortType === "priority" && (
                                  <span className="bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    🏆 Need Rank #{idx + 1}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
                                issue.status === "Resolved" 
                                  ? "bg-green-100 text-green-800 border-green-200" 
                                  : "bg-orange-100 text-orange-850 border-orange-200 animate-pulse"
                              }`}>
                                {issue.status}
                              </span>
                              {issue.citizenSatisfied && (
                                <span className="bg-emerald-600 text-white rounded text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">
                                  ★ Community Satisfied
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row gap-4 mb-4">
                            {issue.imageUrl && (
                              <div className="w-24 h-20 bg-neutral-100 border border-neutral-200 rounded-lg overflow-hidden shrink-0">
                                <img src={issue.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            )}
                            <div>
                              <h3 className="text-base font-extrabold text-neutral-900">{issue.title}</h3>
                              <p className="text-xs text-neutral-500 leading-relaxed mt-1">{issue.description}</p>
                              <div className="flex flex-wrap gap-2.5 mt-2.5 text-[11px] font-semibold text-neutral-400">
                                <span className="text-neutral-600">Location: {issue.location}</span>
                                <span>•</span>
                                <span>Reporter: {issue.reporterName}</span>
                                <span>•</span>
                                <span className="text-orange-600 font-bold bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-md">
                                  Community Needs: {totalVotes} active urgency votes cast (Low: {votes.Low} • Med: {votes.Medium} • High: {votes.High} • Crit: {votes.Critical})
                                </span>
                              </div>

                              {issue.aiAnalysis && (
                                <div className="mt-3.5 flex flex-wrap gap-2 items-center">
                                  {issue.aiAnalysis.estimatedDepartment && (
                                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
                                      🏛️ Routed Dept: {issue.aiAnalysis.estimatedDepartment}
                                    </span>
                                  )}
                                  {issue.aiAnalysis.suggestedAction && (
                                    <span className="bg-neutral-50 border border-neutral-200 text-neutral-700 text-[10.5px] font-bold px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1">
                                      🔧 AI Suggestion: {issue.aiAnalysis.suggestedAction}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Interactive Step Navigator - Solves local user problem step-by-step */}
                          <div className="mt-4 p-4 rounded-xl bg-neutral-50/65 border border-neutral-150">
                            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-3">
                              Step-by-Step Municipal Action Roadway:
                            </label>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {[
                                { step: 1, label: "1. File Submitted" },
                                { step: 2, label: "2. Under Review" },
                                { step: 3, label: "3. Accept Case" },
                                { step: 4, label: "4. Deploy Team" },
                                { step: 5, label: "5. Mark Resolved" }
                              ].map((item) => {
                                const isCurrent = (issue.progressStep || 1) === item.step;
                                const isPassed = (issue.progressStep || 1) >= item.step;

                                return (
                                  <button
                                    key={item.step}
                                    type="button"
                                    onClick={() => handleProgressChange(issue.id, item.step, issue.completedImageUrl)}
                                    className={`py-2 px-1 text-[10px] font-bold rounded-lg text-center transition-all ${
                                      isCurrent
                                        ? "bg-neutral-900 text-white shadow-sm ring-2 ring-neutral-400"
                                        : isPassed
                                        ? "bg-neutral-200 text-neutral-800 hover:bg-neutral-300"
                                        : "bg-white text-neutral-400 border border-neutral-200 hover:bg-neutral-50"
                                    }`}
                                  >
                                    {item.label} {isPassed && "✓"}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* proof photo upload for Admin completed state or completed button */}
                          {((issue.progressStep || 1) === 5 || issue.status === "Resolved") && (
                            <div className="mt-4 p-4 border border-dashed border-orange-200 bg-orange-50/30 rounded-xl">
                              <h4 className="text-xs font-extrabold text-orange-950 mb-1 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-orange-600 fill-current" />
                                Municipal Action: Resolution Verification Photo Required
                              </h4>
                              <p className="text-[10px] text-neutral-500 font-medium mb-3">
                                Provide visual confirmation of repaired pavement, cleaned-up parks, or street light illumination. Paste a URL or select a ready prototype proof:
                              </p>

                              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                <input
                                  type="text"
                                  placeholder="Paste completed work picture URL..."
                                  value={issue.completedImageUrl || ""}
                                  onChange={(e) => handleProgressChange(issue.id, 5, e.target.value)}
                                  className="flex-1 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                                {issue.completedImageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleProgressChange(issue.id, 5, "")}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition"
                                  >
                                    Reset Photo
                                  </button>
                                )}
                              </div>

                              {/* Stock Proof Presets */}
                              <div className="flex flex-wrap gap-2">
                                <span className="text-[9px] font-black uppercase text-neutral-400 self-center">Presets:</span>
                                {[
                                  { label: "Pavement Repaired", url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600" },
                                  { label: "Parks Cleaned", url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=600" },
                                  { label: "Pipe Leak Seal", url: "https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&q=80&w=600" },
                                  { label: "Street Light Restored", url: "https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&q=80&w=600" }
                                ].map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => handleProgressChange(issue.id, 5, preset.url)}
                                    className={`px-2 py-1 bg-white border text-[10px] font-black rounded hover:bg-orange-100/50 transition ${
                                      issue.completedImageUrl === preset.url 
                                        ? "border-orange-500 bg-orange-100 text-orange-850" 
                                        : "border-neutral-200 text-neutral-600"
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>

                              {issue.completedImageUrl && (
                                <div className="mt-3.5 relative w-32 h-20 rounded-lg overflow-hidden border border-neutral-150 shadow-sm animate-fade-in">
                                  <img src={issue.completedImageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <div className="absolute top-1 left-1 py-0.5 px-1 bg-green-700 text-white rounded text-[7px] font-black tracking-wide">
                                    IMAGE ACTIVE
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Admin Feed Comments Thread */}
                          <IssueComments 
                            issue={issue}
                            currentUser={currentUser}
                            onPostComment={handlePostComment}
                            containerId={`comments-admin-${issue.id}`}
                          />

                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Right sidebar */}
                <aside className="w-full lg:w-80 space-y-5 flex-shrink-0">
                  <div className="bg-white rounded-2xl border border-neutral-150 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-orange-600" />
                      <h3 className="text-base font-bold text-neutral-800" id="admin-hub-title">Admin Metrics Hub</h3>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-4">
                      Administrators are empowered to review community consensus rating matrices and execute critical work orders step-by-step.
                    </p>

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center py-2 border-b border-neutral-100 text-xs">
                        <span className="font-semibold text-neutral-600">Total Cataloged</span>
                        <span className="font-extrabold text-neutral-900">{issues.length}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-neutral-100 text-xs">
                        <span className="font-semibold text-neutral-600">Under Active Work</span>
                        <span className="font-extrabold text-orange-600">{issues.filter(i => (i.progressStep || 1) === 4).length}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-neutral-100 text-xs">
                        <span className="font-semibold text-neutral-600">Unresolved Queue</span>
                        <span className="font-extrabold text-blue-600">{issues.filter(i => (i.progressStep || 1) < 5).length}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 text-xs">
                        <span className="font-semibold text-green-700">Finished & Closed</span>
                        <span className="font-extrabold text-green-700">{issues.filter(i => (i.progressStep || 1) === 5).length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-tr from-neutral-900 to-neutral-800 rounded-2xl p-6 text-white shadow-md">
                    <span className="text-[9px] font-black uppercase tracking-wider block mb-1 text-orange-400">Response Charter</span>
                    <p className="text-xs font-semibold leading-relaxed text-neutral-300">
                      We optimize resources based on citizens' self-assigned urgency casting variables. Resolve critical and high votes to maintain healthy community ratings.
                    </p>
                  </div>
                </aside>

              </div>
            )}

            {/* AI SUBMISSION LOADING OVERLAY MODAL */}
            {submittingWithAI && (
              <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl border border-neutral-100 p-6 md:p-8 max-w-sm w-full shadow-lg text-center relative">
                  
                  {aiStep < 5 && !aiError && (
                    <div className="w-12 h-12 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-4"></div>
                  )}

                  {aiStep === 5 && (
                    <div className="bg-emerald-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 border border-emerald-100 text-emerald-600">
                      <Check className="w-6 h-6 stroke-[3]" />
                    </div>
                  )}

                  {aiError && (
                    <div className="bg-rose-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 border border-rose-100 text-rose-600">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-neutral-900">
                    {aiError ? "API Classification Failed" : aiStep < 5 ? "Running Gemini Dispatch" : "Matters Mapped Successfully"}
                  </h3>
                  
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-1">
                    Multimodal Classification Route
                  </p>

                  {!aiError && (
                    <div className="mt-4 text-left space-y-2 bg-neutral-50 p-4 border border-neutral-150 rounded-xl text-xs font-semibold text-neutral-500">
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] border font-bold ${aiStep >= 1 ? "bg-emerald-100 border-emerald-200 text-emerald-800" : "bg-white text-neutral-400"}`}>
                          {aiStep >= 1 ? "✓" : "1"}
                        </span>
                        <span className={aiStep === 1 ? "font-bold text-neutral-900" : ""}>Connection Initialized</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] border font-bold ${aiStep >= 2 ? "bg-emerald-100 border-emerald-200 text-emerald-800" : "bg-white text-neutral-400"}`}>
                          {aiStep >= 2 ? "✓" : "2"}
                        </span>
                        <span className={aiStep === 2 ? "font-bold text-neutral-900" : ""}>Uploading attachments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] border font-bold ${aiStep >= 3 ? "bg-emerald-100 border-emerald-200 text-emerald-800" : "bg-white text-neutral-400"}`}>
                          {aiStep >= 3 ? "✓" : "3"}
                        </span>
                        <span className={aiStep === 3 ? "font-bold text-neutral-900" : ""}>Invoking Gemini AI Agent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] border font-bold ${aiStep >= 4 ? "bg-emerald-100 border-emerald-200 text-emerald-800" : "bg-white text-neutral-400"}`}>
                          {aiStep >= 4 ? "✓" : "4"}
                        </span>
                        <span className={aiStep === 4 ? "font-bold text-neutral-900" : ""}>Auto-assign categories</span>
                      </div>
                    </div>
                  )}

                  {aiError && (
                    <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-left text-xs text-rose-900">
                      <p className="font-bold mb-1">Response details:</p>
                      <p className="leading-relaxed mb-4">{aiError}</p>
                      <button
                        onClick={() => setSubmittingWithAI(false)}
                        className="w-full bg-neutral-900 hover:bg-black text-white py-2 rounded-xl text-xs font-bold transition"
                      >
                        Dismiss Window
                      </button>
                    </div>
                  )}

                  {aiStep === 5 && newlyCreatedId && (
                    <div className="mt-5">
                      <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                        Incident classification processed. Citizens can now review or confirm details in the active feed.
                      </p>
                      
                      <button
                        onClick={handleViewNewlyCreated}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl text-xs font-bold transition"
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-neutral-150 py-5 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2 shrink-0">
        <div>
          Verified ID: <span className="font-bold text-neutral-600 font-mono">{currentUserSession.substring(0, 12)}...</span>
        </div>
        <div className="font-semibold text-neutral-400">
          Community Hero — Designed to build safer, smarter cities.
        </div>
      </footer>

    </div>
  );
}
