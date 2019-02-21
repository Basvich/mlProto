import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoadMl5Component } from './load-ml5/load-ml5.component';
import { XorTfComponent } from './xor-tf/xor-tf.component';
import { LoadTrainingImgsComponent } from './load-training-imgs/load-training-imgs.component';

const routes: Routes = [
  {path: 'loadMl5', component: LoadMl5Component},
  {path: 'xorTf', component: XorTfComponent},
  {path: 'trainImg', component: LoadTrainingImgsComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
