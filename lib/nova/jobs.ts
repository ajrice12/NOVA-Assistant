const KNOWN_SKILLS = [
  "javascript", "typescript", "react", "node.js", "python", "sql", "machine learning", "nlp", "aws", "azure",
  "communication", "leadership", "project management", "data analysis", "statistics", "tableau", "tensorflow", "pytorch",
] as const;

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  publishedAt: string;
}

export interface RankedJob extends JobListing {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export function extractKnownSkills(text: string) {
  const normalized = text.toLowerCase();
  return KNOWN_SKILLS.filter((skill) => normalized.includes(skill));
}

export function rankJob(listing: JobListing, resumeText: string): RankedJob {
  const resumeSkills = extractKnownSkills(resumeText);
  const desiredSkills = extractKnownSkills(`${listing.title} ${listing.description}`);
  const matchedSkills = desiredSkills.filter((skill) => resumeSkills.includes(skill));
  const missingSkills = desiredSkills.filter((skill) => !resumeSkills.includes(skill));
  const matchScore = desiredSkills.length ? Math.round((matchedSkills.length / desiredSkills.length) * 100) : 0;
  return { ...listing, matchScore, matchedSkills, missingSkills };
}

export function rankJobs(listings: JobListing[], resumeText: string) {
  return listings.map((listing) => rankJob(listing, resumeText)).sort((a, b) => b.matchScore - a.matchScore || b.publishedAt.localeCompare(a.publishedAt));
}
