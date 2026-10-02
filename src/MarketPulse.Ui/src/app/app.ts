import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopNav } from './core/layout/top-nav';
import { ToastOutlet } from './core/toast/toast-outlet';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopNav, ToastOutlet],
  templateUrl: './app.html',
})
export class App {}
