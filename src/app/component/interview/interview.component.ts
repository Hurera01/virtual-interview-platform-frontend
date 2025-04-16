import { Component, ElementRef, ViewChild } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Component({
  selector: 'app-interview',
  imports: [],
  templateUrl: './interview.component.html',
  styleUrl: './interview.component.scss',
})
export class InterviewComponent {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  private localStream!: MediaStream;
  private remoteStream!: MediaStream;
  private peerConnection!: RTCPeerConnection;
  private connection!: signalR.HubConnection;

  private readonly config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  ngOnInit() {
    this.initSignalR();
  }

  async initSignalR() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('https://your-api-url/interviewHub')
      .withAutomaticReconnect()
      .build();

    this.connection.on('Receive Offer', async (offer) => {
      await this.createAnswer(offer);
    });

    this.connection.on('ReceiveAnswer', async (answer) => {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    this.connection.on('ReceiveIceCandidate', async (candidate) => {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    await this.connection.start();
    console.log('SignalR Connected');
  }

  async startCall() {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    this.localVideo.nativeElement.srcObject = this.localStream;

    this.peerConnection = new RTCPeerConnection(this.config);

    // Add local stream to peer connection
    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    // Get remote stream
    this.remoteStream = new MediaStream();
    this.remoteVideo.nativeElement.srcObject = this.remoteStream;

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.connection.invoke('SendIceCandidate', event.candidate);
      }
    };

    // Create Offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    await this.connection.invoke('SendOffer', offer);
  }

  async createAnswer(offer: RTCSessionDescriptionInit) {
    this.peerConnection = new RTCPeerConnection(this.config);
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    this.localVideo.nativeElement.srcObject = this.localStream;

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.connection.invoke('SendIceCandidate', event.candidate);
      }
    };

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    await this.connection.invoke('SendAnswer', answer);
  }

  hangUp() {
    this.peerConnection?.close();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.remoteStream?.getTracks().forEach((track) => track.stop());
  }
}
