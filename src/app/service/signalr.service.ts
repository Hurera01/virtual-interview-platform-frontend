import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class SignalrService {

  private connection! : signalR.HubConnection;
  constructor() { }

  connect(): Promise<void>{
    this.connection = new signalR.HubConnectionBuilder()
    .withUrl('https://localhost:7037/video-hub')
    .withAutomaticReconnect()
    .build();

    return this.connection.start();
  }

  onOffer(callback: (offer: any) => void): void{
    // debugger
    this.connection.on('Receive Offer', callback);
  }

  onAnswer(callback: (answer : any) => void ): void{
    this.connection.on('Receive Answer', callback);
  }

  onIceCandidate(callback: (candidate: any) => void): void {
    this.connection.on('ReceiveIceCandidate', callback);
  }

  sendOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    // debugger
    return this.connection.invoke('SendOffer', {type: offer.type, sdp: offer.sdp});
  }

  sendAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    return this.connection.invoke('SendAnswer', answer);
  }

  sendIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    return this.connection.invoke('SendIceCandidate', candidate);
  }

}
