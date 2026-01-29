import { Component, OnInit, inject, signal, ElementRef, ViewChild, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { MediaService } from '../services/media.service';
import { UiStatus, TriageResultResponse, ClinicalFormRequest } from '../models/api.models';

@Component({
  selector: 'app-triage',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './triage.html',
  styleUrl: './triage.css'
})
export class TriageComponent implements OnInit, AfterViewInit {
  private readonly apiService = inject(ApiService);
  private readonly mediaService = inject(MediaService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('videoPreview') videoPreview!: ElementRef<HTMLVideoElement>;

  // Signals for reactive state
  correlationId = signal<string>('');
  status = signal<UiStatus>('INIT');
  triageResult = signal<TriageResultResponse | null>(null);
  errorMessage = signal<string>('');
  localStream = this.mediaService.localStream;

  // Reactive form
  triageForm: FormGroup;

  constructor() {
    this.triageForm = this.fb.group({
      complaint: this.fb.group({
        description: ['', Validators.required],
        duration: ['', Validators.required],
        severity: ['', Validators.required]
      }),
      vitalSigns: this.fb.group({
        heartRate: [null],
        systolicBp: [null],
        diastolicBp: [null],
        temperature: [null],
        oxygenSaturation: [null]
      }),
      medicalHistory: this.fb.group({
        conditions: [''],
        medications: [''],
        allergies: ['']
      })
    });

    // Effect to update video srcObject when localStream changes
    effect(() => {
      const stream = this.localStream();
      if (this.videoPreview?.nativeElement && stream) {
        this.videoPreview.nativeElement.srcObject = stream;
      }
    });
  }

  ngOnInit(): void {
    this.initializeSession();
  }

  ngAfterViewInit(): void {
    // Update video element if stream already exists
    const stream = this.localStream();
    if (this.videoPreview?.nativeElement && stream) {
      this.videoPreview.nativeElement.srcObject = stream;
    }
  }

  private async initializeSession(): Promise<void> {
    try {
      // Create session
      this.apiService.createSession().subscribe({
        next: async (response) => {
          this.correlationId.set(response.correlationId);

          try {
            // Start streaming
            await this.mediaService.startStreaming(response.correlationId);
            this.status.set('STREAMING');

            // Update video element with stream
            if (this.videoPreview?.nativeElement) {
              this.videoPreview.nativeElement.srcObject = this.localStream();
            }
          } catch (error) {
            console.error('Streaming error:', error);
            this.errorMessage.set('An unexpected error occurred. Please restart the session.');
          }
        },
        error: (error) => {
          console.error('Session creation error:', error);
          this.errorMessage.set('An unexpected error occurred. Please restart the session.');
        }
      });
    } catch (error) {
      console.error('Initialization error:', error);
      this.errorMessage.set('An unexpected error occurred. Please restart the session.');
    }
  }

  onSubmit(): void {
    if (this.triageForm.invalid || this.status() === 'SUBMITTED' || this.status() === 'DONE') {
      return;
    }

    // Stop streaming
    this.mediaService.stopStreaming();
    this.status.set('SUBMITTED');

    // Prepare form data
    const formValue = this.triageForm.value;
    const formData: ClinicalFormRequest = {
      complaint: {
        description: formValue.complaint.description,
        duration: formValue.complaint.duration,
        severity: formValue.complaint.severity
      },
      vitalSigns: {
        heartRate: formValue.vitalSigns.heartRate || undefined,
        systolicBp: formValue.vitalSigns.systolicBp || undefined,
        diastolicBp: formValue.vitalSigns.diastolicBp || undefined,
        temperature: formValue.vitalSigns.temperature || undefined,
        oxygenSaturation: formValue.vitalSigns.oxygenSaturation || undefined
      },
      medicalHistory: {
        conditions: this.parseCommaSeparated(formValue.medicalHistory.conditions),
        medications: this.parseCommaSeparated(formValue.medicalHistory.medications),
        allergies: this.parseCommaSeparated(formValue.medicalHistory.allergies)
      }
    };

    // Submit form
    this.apiService.submitForm(this.correlationId(), formData).subscribe({
      next: (result) => {
        this.triageResult.set(result);
        this.status.set('DONE');
      },
      error: (error) => {
        console.error('Form submission error:', error);
        this.errorMessage.set('An unexpected error occurred. Please restart the session.');
      }
    });
  }

  private parseCommaSeparated(value: string): string[] {
    if (!value || value.trim() === '') {
      return [];
    }
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  reload(): void {
    window.location.reload();
  }

  getStatusLabel(): string {
    switch (this.status()) {
      case 'INIT':
        return 'Starting session...';
      case 'STREAMING':
        return 'Recording audio and video';
      case 'SUBMITTED':
        return 'Submitting information...';
      case 'DONE':
        return 'Analysis complete';
      default:
        return '';
    }
  }

  getTriageLevelClass(): string {
    const result = this.triageResult();
    if (!result) return '';

    switch (result.triageLevel) {
      case 'LOW':
        return 'triage-low';
      case 'MEDIUM':
        return 'triage-medium';
      case 'HIGH':
        return 'triage-high';
      default:
        return '';
    }
  }

  getConfidencePercentage(): string {
    const result = this.triageResult();
    if (!result) return '0%';
    return `${Math.round(result.confidence * 100)}%`;
  }

  isSubmitDisabled(): boolean {
    return this.triageForm.invalid || this.status() === 'SUBMITTED' || this.status() === 'DONE';
  }
}
