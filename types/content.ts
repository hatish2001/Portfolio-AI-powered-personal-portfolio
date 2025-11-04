export type TileTag = string;

export interface AppItem {
  id: string;
  title: string;
  shortDescription: string;
  tech: string[];
  role: string;
  dateRange: string;
  thumbnail: string;
  previewVideo?: string;
  repoUrl?: string;
  liveUrl?: string;
  status?: "Live" | "Beta" | "WIP";
  featured?: boolean;
  tags?: TileTag[];
  problem?: string;
  solution?: string;
  myContribution?: string;
  features?: string[];
  architecture?: string;
  screenshots?: string[];
  metrics?: Record<string, number>;
  learned?: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  program: string;
  degreeLevel: string;
  period: string;
  thumbnail: string;
  tags?: TileTag[];
  courses?: string[];
  projects?: string[];
  honors?: string[];
  gpa?: number;
  proof?: string[];
}

export interface HobbyItem {
  id: string;
  title: string;
  thumbnail: string;
  shortDescription: string;
  tags?: TileTag[];
  story?: string;
  gallery?: string[];
  links?: string[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  period: string;
  thumbnail: string;
  tags?: TileTag[];
  responsibilities?: string[];
  impact?: Record<string, number>;
  stack?: string[];
  links?: string[];
}

export interface AboutData {
  headline: string;
  bio: string;
  photo: string;
  skills: Record<string, string[]>;
  contact: {
    email: string;
    github: string;
    linkedin: string;
    phone?: string;
  };
  resumeUrl?: string;
}

export interface ContentData {
  apps: AppItem[];
  education: EducationItem[];
  hobbies?: HobbyItem[]; // Made optional - focusing on professional content
  experience: ExperienceItem[];
  about: AboutData;
}

export type ContentSection = keyof Omit<ContentData, 'about'>;
export type ContentItem = AppItem | EducationItem | HobbyItem | ExperienceItem;
