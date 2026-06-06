import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectMember } from '../../../project.model';

export type TaskPriority = 'low' | 'medium' | 'high';

interface PriorityOption {
  value: TaskPriority;
  label: string;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.css'
})
export class FilterBarComponent {
  // Inputs (@Input)
  readonly members = input<ProjectMember[]>([]);
  readonly selectedPriorities = input<TaskPriority[]>([]);
  readonly selectedAssignee = input<number | 'all'>('all');

  // Outputs (@Output)
  readonly priorityToggle = output<TaskPriority>();
  readonly allPriorities = output<void>();
  readonly assigneeChange = output<number | 'all'>();

  protected readonly priorityOptions: PriorityOption[] = [
    { value: 'high', label: 'Haute' },
    { value: 'medium', label: 'Moyenne' },
    { value: 'low', label: 'Basse' }
  ];

  protected isPrioritySelected(priority: TaskPriority): boolean {
    return this.selectedPriorities().includes(priority);
  }

  protected onTogglePriority(priority: TaskPriority): void {
    this.priorityToggle.emit(priority);
  }

  protected onSelectAll(): void {
    this.allPriorities.emit();
  }

  protected onAssigneeChange(value: string): void {
    this.assigneeChange.emit(value === 'all' ? 'all' : Number(value));
  }
}
