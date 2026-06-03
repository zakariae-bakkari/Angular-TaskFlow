export interface Task{
    id:number;
    title:string;
    description?:string;
    status: 'todo' | 'in-progress' | 'done';
    assigneeId?: number;//id du user qui a la tache ref user.id
    createdAt?:string;
    updatedAt?:string;
    dueDate?: string;
    priority?:'low'|'medium'|'high';
}