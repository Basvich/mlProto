import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoadMl5Component } from './load-ml5/load-ml5.component';
import { XorTfComponent } from './xor-tf/xor-tf.component';

@NgModule({
  declarations: [
    AppComponent,
    LoadMl5Component,
    XorTfComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
