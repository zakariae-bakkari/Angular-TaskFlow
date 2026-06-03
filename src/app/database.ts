import type { User } from './user.model';
import type { Task } from './task.model';

//pour les types 
interface database{
    users:User[];
    tasks:Task[]
}

const DB: database = {
  users: [
    { id: 1, name: 'Meriem Hamri', email: 'meriem@taskflow.com', password: 'password123' },
    { id: 2, name: 'Zakariae Bakkari', email: 'zakariae@taskflow.com', password: 'password123' },
    { id: 3, name: 'Sara Alami', email: 'sara@taskflow.com', password: 'password123' },
  ],
  // NOTE: passwords are stored in plaintext here ONLY for local development
  // and testing. Never store plaintext passwords in production. Use a backend
  // service with proper password hashing and secure authentication.
  tasks: [
    { id: 1, title: 'Configurer le projet', status: 'done', priority: 'high', assigneeId: 1, dueDate: '2025-05-01' },
    { id: 2, title: 'Créer les composants', status: 'in-progress', priority: 'high', assigneeId: 2, dueDate: '2025-05-10' },
    { id: 3, title: 'Rédiger les tests', status: 'todo', priority: 'medium', assigneeId: 1, dueDate: '2025-05-20' },
  ]
};

export function findUserByEmail(email: string): User | undefined {
  return DB.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function getTasksForUser(userId: number): Task[] {
  // return shallow copies to avoid external code mutating the DB objects
  return DB.tasks.filter(t => t.assigneeId === userId).map(t => ({ ...t }));
}

export function findTaskById(id: number): Task | undefined {
  const t = DB.tasks.find(t => t.id === id);
  return t ? { ...t } : undefined;
}
