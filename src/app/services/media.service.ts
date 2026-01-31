import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { WebRTCOfferRequest, WebRTCAnswerResponse } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly signalingUrl = 'http://localhost:8000';

  private peerConnection: RTCPeerConnection | null = null;
  private _localStream = signal<MediaStream | null>(null);
  private _videoEnabled = signal<boolean>(true);
  private _audioEnabled = signal<boolean>(true);

  readonly localStream = this._localStream.asReadonly();
  readonly videoEnabled = this._videoEnabled.asReadonly();
  readonly audioEnabled = this._audioEnabled.asReadonly();

  async startStreaming(correlationId: string): Promise<MediaStream> {
    // Acquire local media stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    this._localStream.set(stream);
    // Initialize track enabled signals based on acquired tracks
    const hasVideo = stream.getVideoTracks().length > 0;
    const hasAudio = stream.getAudioTracks().length > 0;
    this._videoEnabled.set(hasVideo ? stream.getVideoTracks()[0].enabled : false);
    this._audioEnabled.set(hasAudio ? stream.getAudioTracks()[0].enabled : false);

    // Create peer connection (no STUN/TURN needed for localhost)
    this.peerConnection = new RTCPeerConnection({ iceServers: [] });

    // Add tracks to peer connection
    stream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, stream);
    });

    // Create and set local description (offer)
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Send offer to signaling server
    const offerRequest: WebRTCOfferRequest = {
      correlationId,
      sdp: offer.sdp!,
      type: offer.type
    };

    const answer = await firstValueFrom(
      this.http.post<WebRTCAnswerResponse>(`${this.signalingUrl}/offer`, offerRequest)
    );

    // Set remote description with answer
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription({ sdp: answer.sdp, type: answer.type as RTCSdpType })
    );

    return stream;
  }

  stopStreaming(): void {
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop all tracks on local stream
    const stream = this._localStream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this._localStream.set(null);
      this._videoEnabled.set(false);
      this._audioEnabled.set(false);
    }
  }

  toggleVideoTrack(): void {
    const stream = this._localStream();
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) return;
    // Toggle enabled state for all video tracks
    const newState = !videoTracks[0].enabled;
    videoTracks.forEach(track => (track.enabled = newState));
    this._videoEnabled.set(newState);
  }

  toggleAudioTrack(): void {
    const stream = this._localStream();
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;
    const newState = !audioTracks[0].enabled;
    audioTracks.forEach(track => (track.enabled = newState));
    this._audioEnabled.set(newState);
  }
}
