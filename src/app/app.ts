import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, IonApp],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'creativewriter2';
}
