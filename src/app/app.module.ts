import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Permite los ngBinding en los input

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgxFileDropModule } from 'ngx-file-drop';
import { LoadMl5Component } from './load-ml5/load-ml5.component';
import { XorTfComponent } from './xor-tf/xor-tf.component';
import { LoadTrainingImgsComponent } from './load-training-imgs/load-training-imgs.component';
import { InvPendComponent } from './inv-pend/inv-pend.component';

@NgModule({
  declarations: [
    AppComponent,
    LoadMl5Component,
    XorTfComponent,
    LoadTrainingImgsComponent,
    InvPendComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgxFileDropModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
