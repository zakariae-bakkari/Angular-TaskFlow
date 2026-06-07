import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../../task.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.css'
})
export class TaskCardComponent {
  readonly task = input.required<Task>();
}
