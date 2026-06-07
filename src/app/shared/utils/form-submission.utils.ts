import { FormGroup } from '@angular/forms';
import { WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';

export interface FormSubmissionConfig<T> {
  form: FormGroup;
  isLoading: WritableSignal<boolean>;
  errorMessage: WritableSignal<string | null>;
  request: () => Observable<T>;
  onSuccess: (result: T) => void;
  defaultErrorMessage?: string;
}

export function handleFormSubmission<T>(config: FormSubmissionConfig<T>): void {
  const { form, isLoading, errorMessage, request, onSuccess, defaultErrorMessage } = config;

  if (form.invalid) {
    form.markAllAsTouched();
    return;
  }

  isLoading.set(true);
  errorMessage.set(null);

  request().subscribe({
    next: (result) => {
      isLoading.set(false);
      onSuccess(result);
    },
    error: (err) => {
      isLoading.set(false);
      errorMessage.set(err.message || defaultErrorMessage || 'Une erreur est survenue.');
    }
  });
}
