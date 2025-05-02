import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class SignalrService {

  private connection! : signalR.HubConnection;
  private roomId: string = 'interview-room-abc123';

  constructor() { }

  connect(): Promise<void>{
    this.connection = new signalR.HubConnectionBuilder()
    .withUrl('https://localhost:7037/video-hub')
    .withAutomaticReconnect()
    .build();

    return this.connection.start().then(() => {
      console.log('SignalR Connected');
      return this.connection.invoke('JoinRoom', this.roomId);
    });
  }

  onOffer(callback: (offer: RTCSessionDescriptionInit) => void): void{
    // debugger
    this.connection.on('Receive Offer', callback);
  }

  onAnswer(callback: (answer : RTCSessionDescriptionInit) => void ): void{
    this.connection.on('Receive Answer', callback);
  }

  onIceCandidate(callback: (candidate: RTCSessionDescriptionInit) => void): void {
    this.connection.on('ReceiveIceCandidate', callback);
  }

  sendOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    // debugger
    return this.connection.invoke('SendOffer', this.roomId,{type: offer.type, sdp: offer.sdp});
  }

  sendAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    return this.connection.invoke('SendAnswer', this.roomId ,{type: answer.type, sdp: answer.sdp});
  }

  sendIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    return this.connection.invoke('SendIceCandidate', this.roomId ,{candidate: candidate.candidate, sdpMid: candidate.sdpMid, sdpMLineIndex: candidate.sdpMLineIndex});
  }

}
