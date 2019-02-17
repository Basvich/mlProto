import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
// import { from, observable } from 'rxjs';
import * as Rx from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import * as ml5 from 'ml5';
import * as p5 from 'p5';
import 'p5/lib/addons/p5.sound';
import 'p5/lib/addons/p5.dom';
import { from, of } from 'rxjs';

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

  testObservable() {
    this.testObserver().subscribe(
      (val: string) => console.log(val),
      (err) => console.error(err),
      () => console.log('completado observable 1')
    );
    /*this.loadImage('../../assets/imgSrc/typeA/WIN_20190130_16_34_27_Pro.jpg').subscribe(
      (val) => {
        console.log('cargada imagen');
      },
      (err) => {
        console.error(err);
      });*/
    this.http.get('../../assets/imgSrc/imgList.json', {}).pipe(
      mergeMap((data: any) => this.imgsSrcs$(data)),
      mergeMap((data: any) => this.loadImage$(data))
    ).subscribe(
      (value: any) => {
        console.log(value);
      },
      (err) => console.error(err),
      () => console.log('acabado algo')
    );

    /* this.http.get('../../assets/imgSrc/imgList.json', {}).subscribe(
      (data: any) => {
        console.log('ok');
        this.imgsSrcs$(data).subscribe(
          (item) => {
            console.log(item);
          },
          (err) => console.error(err),
          () => {
            console.log('finalizado entrenamiento');
          }

        );
      },
      (error) => {
        console.error(error);
      }
    );*/

  }

  testObservable2(){
    const d1 = [1, 2, 3, 4, 5];
    const o$ = from(d1);

    const o2$ = o$.pipe(
      mergeMap( (val: any) => of(this.ch1(val))),
      mergeMap( (val: any) => of(this.ch2(val))),
    );
    let c = 0;
    o2$.subscribe(
      (val) => {
        console.log(`${c} - '${val}'`);
        c++;
      },
      (err) => console.error(err),
      () => console.log('Acabose')
    );
  }

  ch1(val: number): string{
    return `${val}A`;
  }

  ch2(val: string): string{
    return `${val}B`;
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
        //const mg = p5.loadImage(dir);
        const img = new Image();
        img.src = dir;
        img.onload = () => {
          this.classifier.addImage(img, label);
          console.log(`imagen cargada como ${label}`);
        };
        //this.classifier.addImage(mg, label);
      }
    }
  }

  /**
   * Carga la imagen
   * @param {string} imagePath
   * @returns {Rx.Observable<HTMLImageElement>}
   * @memberof LoadMl5Component
   */
  loadImage$(imagePath: {url: string}): Rx.Observable<any> {
    return Rx.Observable.create(function(observer: Rx.Subscriber<any>) {
      const res: {url: string, img?: any} = Object.assign({}, imagePath);
      const img = new Image();
      img.src = imagePath.url;
      img.onload = function() {
        res.img = img;
        observer.next(res);
        observer.complete();
      };
      img.onerror = function(err) {
        observer.error(err);
      };
    });
  }

  testObserver(): Rx.Observable<string> {
    return Rx.Observable.create(function (observer: Rx.Subscriber<string>) {
      observer.next('Hello');
      observer.next('World');
      observer.complete();
    });
  }

  /** Devuelve un par  url y label a asignar a esa imagen
   * @param {Array<ITrainDataImage>} data
   * @returns {Rx.Observable<any>}
   * @memberof LoadMl5Component
   */
  imgsSrcs$(data: Array<ITrainDataImage>): Rx.Observable<any> {
    return Rx.Observable.create(function (observer: Rx.Subscriber<any>) {
      for (const group of data) {
        const label = group.type;
        const baseDir = Location.joinWithSlash('../../assets/imgSrc', group.dir);
        for (const fileName of group.files) {
          const dir = Location.joinWithSlash(baseDir, fileName);
          observer.next({ url: dir, label });
          // this.classifier.addImage(mg, label);
        }
      }
      observer.complete();
    });
  }







}
