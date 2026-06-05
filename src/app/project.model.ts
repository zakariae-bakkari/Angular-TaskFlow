export interface Project {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: 'Owner' | 'Admin' | 'Collaborator' | 'Viewer';
  // UI helpers
  userName?: string;
  userEmail?: string;
}
