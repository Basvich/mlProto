import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoadMl5Component } from './load-ml5/load-ml5.component';

const routes: Routes = [
  {path: 'loadMl5', component: LoadMl5Component}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
