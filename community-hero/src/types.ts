export type CategoryType = 'Road Damage' | 'Garbage' | 'Water Leakage' | 'Street Light' | 'Public Safety' | 'Other';
export type UrgencyType = 'Low' | 'Medium' | 'High' | 'Critical';
export type StatusType = 'Open' | 'Resolved';

export interface UrgencyVotes {
  Low: number;
  Medium: number;
  High: number;
  Critical: number;
}

export interface AIAnalysis {
  category: CategoryType;
  urgency: UrgencyType;
  reason: string;
  isFallback?: boolean;
  suggestedAction?: string;
  estimatedDepartment?: string;
}

export interface IssueComment {
  id: string;
  authorName: string;
  authorRole: 'citizen' | 'admin';
  content: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  location: string;
  category: CategoryType;
  urgency: UrgencyType;
  status: StatusType;
  imageUrl?: string;
  verificationCount: number;
  verifiedBy: string[]; // List of mock user ids or IP/session placeholders
  urgencyVotes: UrgencyVotes;
  votedUrgency?: Record<string, UrgencyType>; // Record of user session to their chosen urgency vote
  aiAnalysis?: AIAnalysis;
  createdAt: string;
  reporterName: string;
  progressStep?: number; // 1 = Submitted, 2 = Under Review, 3 = Accepted, 4 = Working, 5 = Completed
  completedImageUrl?: string; // Admin's proof image of completion
  citizenSatisfied?: boolean; // Citizen satisfaction action after resolution
  comments?: IssueComment[];
}
