import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as ml5 from 'ml5';

interface IDataImage {
  type: string;
  dir: string;
  files: Array<string>;
}

@Component({
  selector: 'app-load-ml5',
  templateUrl: './load-ml5.component.html',
  styleUrls: ['./load-ml5.component.less']
})
export class LoadMl5Component implements OnInit {

  constructor(private http: HttpClient) { }

  ngOnInit() {
  }

  test1() {
    const image = document.getElementById('image');
    const classifier = ml5.imageClassifier('MobileNet', function () {
      console.log('Model Loaded!');
    });

    classifier.predict(image, function (err, results) {
      console.log('Predicho');
      console.log(results[0].className);
      console.log(results[0].probability.toFixed(4));
    });

  }

  test2() {
    const features = ml5.featureExtractor('MobileNet');
    const classifier = features.classification();
    const puffinImage1 = document.getElementById('imageA1');
    classifier.addImage(puffinImage1, 'typeA');
  }

  test3() {
    this.http.get('../../assets/imgSrc/typeA/WIN_20190130_16_34_27_Pro.jpg', { responseType: 'blob' }).subscribe(
      (data) => {
        console.log('ok');
      },
      (error) => {
        console.error(error);
      }
    );
    this.http.get('../../assets/imgSrc/typeA', { }).subscribe(
      (data) => {
        console.log('ok');
      },
      (error) => {
        console.error(error);
      }
    );
  }

  learn1() {

  }

}
