import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import * as ml5 from 'ml5';
import * as p5 from 'p5';
import 'p5/lib/addons/p5.sound';
import 'p5/lib/addons/p5.dom';

interface ITrainDataImage {
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
  featureExtractor: any;
  classifier: any;
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
    this.http.get('../../assets/imgSrc/typeA', {}).subscribe(
      (data) => {
        console.log('ok');
      },
      (error) => {
        console.error(error);
      }
    );
  }

  learn1() {
    this.http.get('../../assets/imgSrc/imgList.json', {}).subscribe(
      (data: any) => {
        console.log('ok');
        this.train(data);
      },
      (error) => {
        console.error(error);
      }
    );
  }

  protected train(data: Array<ITrainDataImage>) {
    if (!this.featureExtractor) {
      this.featureExtractor = ml5.featureExtractor('MobileNet');
    }
    if (!this.classifier) {
      this.classifier = this.featureExtractor.classification();
    }

    for (const group of data) {
      const label = group.type;
      const baseDir = Location.joinWithSlash('../../assets/imgSrc', group.dir);
      for (const fileName of group.files) {
        const dir = Location.joinWithSlash(baseDir, fileName);
        const mg = p5.loadImage(dir);
        this.classifier.addImage(mg, label);
      }
    }
  }

}
