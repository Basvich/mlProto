import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
// import { from, observable } from 'rxjs';
import * as Rx from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

// import * as ml5 from 'ml5';
import * as p5 from 'p5';
import 'p5/lib/addons/p5.sound';
import 'p5/lib/addons/p5.dom';
import { from, of } from 'rxjs';
import { pad4d, math } from '@tensorflow/tfjs-core';

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
  currImgNameTest: string = null;
  @ViewChild('miImg') viewImg: ElementRef;
  constructor(private http: HttpClient) { }

  ngOnInit() {
  }

  protected createClasifier() {
    if (!this.featureExtractor) {
      // this.featureExtractor = ml5.featureExtractor('MobileNet');
    }
    if (!this.classifier) {
      // this.classifier = this.featureExtractor.classification();
    }
  }

  test1() {
    console.log(this.viewImg);
    this.createClasifier();

    const image = document.getElementById('image');
    /*const classifier = ml5.imageClassifier('MobileNet', function() {
     console.log('Model Loaded!');
   });*/

    this.classifier.predict(image, function(err, results) {
      console.log('Predicho');
      console.log(results[0].className);
      console.log(results[0].probability.toFixed(4));
    });


  }

  private test2() {
   /*  const features = ml5.featureExtractor('MobileNet');
    const classifier = features.classification();
    const puffinImage1 = document.getElementById('imageA1');
    classifier.addImage(puffinImage1, 'typeA'); */
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
    this.createClasifier();
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
        this.classifier.addImage(value.img, value.label);
      },
      (err) => console.error(err),
      () => this.doEndTraining()
    );
  }

  protected doEndTraining() {
    console.log('acabado algo');
  }

  train1() {
    let loss = 0;
   /*  this.classifier.train(function (lossValue) {
      if (lossValue) {
        loss = lossValue;
        console.log(`loss: ${loss}`);
        // select('#loss').html('Loss: ' + loss);
      } else {
        console.log(`finall loss: ${loss}`);
        // select('#loss').html('Done Training! Final Loss: ' + loss);
      }
    }); */
  }

  testObservable2() {
    const d1 = [1, 2, 3, 4, 5];
    const o$ = from(d1);

    const o2$ = o$.pipe(
      mergeMap((val: any) => of(this.ch1(val))),
      mergeMap((val: any) => of(this.ch2(val))),
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

  ch1(val: number): string {
    return `${val}A`;
  }

  ch2(val: string): string {
    return `${val}B`;
  }

  protected train(data: Array<ITrainDataImage>) {
    /* if (!this.featureExtractor) {
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
        // const mg = p5.loadImage(dir);
        const img = new Image();
        img.src = dir;
        img.onload = () => {
          this.classifier.addImage(img, label);
          console.log(`imagen cargada como ${label}`);
        };
        // this.classifier.addImage(mg, label);
      }
    } */
  }



  /**
   * Carga la imagen
   * @param  imagePath Objeto con una propiedad al menos que es la url
   * @returns
   * @memberof LoadMl5Component
   */
  loadImage$(imagePath: { url: string }): Rx.Observable<any> {
    return Rx.Observable.create(function (observer: Rx.Subscriber<any>) {
      const res: { url: string, img?: any } = Object.assign({}, imagePath);
      const img = new Image();
      img.src = imagePath.url;
      img.onload = function () {
        res.img = img;
        observer.next(res);
        observer.complete();
      };
      img.onerror = function(err) {
        observer.error(err);
      };
    });
  }

  loadImgTest() {
    this.http.get('../../assets/imgSrc/imgList.json', {}).pipe(
      mergeMap((data: Array<ITrainDataImage>) => this.rndImage$(data))
    ).subscribe(
      (img: HTMLImageElement) => {
        (this.viewImg.nativeElement as HTMLImageElement).src = img.src;
        this.showPredictImg(img);
      }
    );
  }

  showPredictImg(img: HTMLImageElement) {
    this.predict$(img).subscribe(
      (val) => {
        console.log(val);
      }
    );
  }

  predict$(img: HTMLImageElement): Rx.Observable<any> {
    // return from(this.classifier.predict(img));
    return from(this.classifier.classify(img));
  }

  rndImage$(data: Array<ITrainDataImage>): Rx.Observable<any> {
    const ig = this.rndNext(data.length);
    const group = data[ig];
    const baseDir = Location.joinWithSlash('../../assets/imgSrc', group.dir);
    const ifi = this.rndNext(group.files.length);
    const dir = Location.joinWithSlash(baseDir, group.files[ifi]);
    return Rx.Observable.create(function (observer: Rx.Subscriber<any>) {
      const img: HTMLImageElement = new Image();
      img.src = dir;
      img.onload = function() {
        observer.next(img);
        observer.complete();
      };
      img.onerror = function (err) {
        observer.error(err);
      };
    });
    // return this.http.get(dir);
  }

  rndNext(max: number): number {
    return Math.trunc(Math.random() * max);
  }

  testObserver(): Rx.Observable<string> {
    return Rx.Observable.create(function (observer: Rx.Subscriber<string>) {
      observer.next('Hello');
      observer.next('World');
      observer.complete();
    });
  }

  /** Devuelve un par  url y label a asignar a esa imagen
   * @param data Arbol de datos de los que saca
   * @returns Un observable con la url de la imagen y el label para clasificar
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

  showStat(){
    this.createClasifier();
    console.log(this.featureExtractor.modelLoaded);
    console.log(this.featureExtractor.hasAnyTrainedClass);
    console.log(this.featureExtractor.usageType);
    console.log(this.featureExtractor.isPredicting);
  }






}
