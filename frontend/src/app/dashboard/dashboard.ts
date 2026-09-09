import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth';

@Component({
  imports: [CommonModule],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  user: any = null;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.checkSession().subscribe({
      next: (res: any) => this.user = res.user,
      error: () => console.log('No hay sesión activa')
    });
  }
}