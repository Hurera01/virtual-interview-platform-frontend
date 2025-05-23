import { Component, ElementRef, ViewChild } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { SignalrService } from '../../service/signalr.service';

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

  constructor(private signalrService: SignalrService){}

  ngOnInit() {
    this.signalrService.connect().then(() => {
      console.log('SignalR connected');

      this.signalrService.onOffer(async (offer) => {
        await this.createAnswer(offer);
      });

      this.signalrService.onAnswer(async (answer) => {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      });

      this.signalrService.onIceCandidate(async (candidate: any) => {
        await this.peerConnection.addIceCandidate(candidate);
      });
    });
  }

  // async initSignalR() {
  //   this.connection = new signalR.HubConnectionBuilder()
  //     .withUrl('wss://localhost:7037/video-hub')
  //     .withAutomaticReconnect()
  //     .build();

  //   this.connection.on('Receive Offer', async (offer) => {
  //     await this.createAnswer(offer);
  //   });

  //   this.connection.on('ReceiveAnswer', async (answer) => {
  //     await this.peerConnection.setRemoteDescription(
  //       new RTCSessionDescription(answer)
  //     );
  //   });

  //   this.connection.on('ReceiveIceCandidate', async (candidate) => {
  //     await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  //   });

  //   await this.connection.start();
  //   console.log('SignalR Connected');
  // }

  async startCall() {
    // debugger;
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
        this.signalrService.sendIceCandidate(event.candidate);
      }
    };

    // Create Offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.signalrService.sendOffer(offer);
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

    this.remoteStream = new MediaStream();
    this.remoteVideo.nativeElement.srcObject = this.remoteStream;

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalrService.sendIceCandidate(event.candidate);
      }
    };

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.signalrService.sendAnswer(answer);
  }

  hangUp() {
    this.peerConnection?.close();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.remoteStream?.getTracks().forEach((track) => track.stop());
  }
}
