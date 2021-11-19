'use strict';
const sharp = require('sharp');

class Board {
	constructor(w, h){
		this.w = w;
		this.h = h;
		this.m = new Array(h);
		for(let i = 0; i < this.m.length; i++) this.m[i] = new Array(w).fill(" ");
	}
	
	print(){
		let str = "";
		for(let i = this.h - 1; i >= 0; i--){
			for(let j = 0; j < this.w; j++){
				str += this.m[i][j];
			}
			str += '\n';
		}
		console.log(str);
	}
	
	clear(v = " "){
		for(let i = 0; i < this.h; i++){
			for(let j = 0; j < this.w; j++){
				this.m[i][j] = v;
			}
		}
	}
}

let lut = [];
function nearest(x){
	let minDist=999, minVal = 20;
	for(let i = 0; i < lut.length; i++){
		let dist = Math.abs(x - lut[i]);
		if(dist < minDist){
			minDist = dist;
			minVal = lut[i];
		}
	}
	if(minDist < 5){
		return minVal;
	}
	return 0;
}

function xy(idx, w){
	return [idx % w, Math.floor(idx/w)];
}

function idx(x, y, w){
	return w*y+x;
}

function mean(arr, counted){
	let ret = 0, l = 0, arrlength = arr.length;
	for(let i = 0; i < arrlength; i++){
		if(!counted[i])continue;
		ret += arr[i];
		l++;
	}
	return ret / l;
}

function getMedium(arr, delta = 10){
	let counted = new Array(arr.length).fill(true);
	let maxIdx, max=99999999;
	let len = arr.length;
	while(max > delta){
		max=-1;
		let m = mean(arr, counted);
		for(let i = 0; i < len; i++){
			if(!counted[i])continue;
			let curErr = Math.abs(arr[i] - m);
			if(curErr > max){
				max = curErr;
				maxIdx = i;
			}
		}
		
		if(max > delta)counted[maxIdx] = false;
	}
	return mean(arr, counted);
}

function idxMirror(x, y, w, h){
	x = x < 0 ? -x : x >= w ? w+w-x : x;
	y = y < 0 ? -y : y >= h ? h+h-y : y;
	return idx(x, y, w);
}

function wmf(data, w, h){
	let ret = data.slice();
	let mat = [
		[1,2,3,2,1],
		[2,3,5,3,2],
		[3,5,7,5,3],
		[2,3,5,3,2],
		[1,2,3,2,1],
	];
	let len = mat.length,
		len2 = Math.floor(len/2);

	for(let i = 0; i < h; i++){
		if(i%(h/100|1) == 0)process.stdout.write("wmf: " + i + "/" + h + "\r");
		for(let j = 0; j < w; j++){
			let arr = [];
			for(let k = 0; k < mat.length; k++){
				for(let l = 0; l < mat.length; l++){
					for(let n = 0; n < mat[k][l]; n++)
						arr.push(data[idxMirror(j+l-len2, i+k-len2, w, h)]);
				}
			}
			arr = arr.sort();
			let val = arr[Math.floor(arr.length/2)];
			if(Math.abs(data[w*i+j] - val) < 5)ret[w*i+j] = val;
			//ret[w*i+j] = data[w*i+j];
		}
	}
	console.log("wmf done");
	console.log(w*10+3, idxMirror(3, -10, w,h));
	return ret;
}

function localThreshold(data, w, h){
	let ret = data.slice();
	let rad = 40;

	for(let i = 0; i < h; i++){
		if(i%(h/100|1) == 0)process.stdout.write("wmf: " + i + "/" + h + "\r");
		for(let j = 0; j < w; j++){
			let avg = 0;
			let min = 999, max = -1;
			for(let k = -rad; k < rad; k++){
				for(let l = -rad; l < rad; l++){
					let cur = data[idxMirror(j+l, i+k, w, h)];
					min = Math.min(cur, min);
					max = Math.max(cur, max);
					avg += cur;
				}
			}
			avg /= rad*rad*4;
			if(max - min < 5)ret[w*i+j] = avg;
			if(data[w*i+j] < avg)ret[w*i+j] = 0;
			else ret[w*i+j] = 255;
		}
	}
	console.log("wmf done");
	console.log(w*10+3, idxMirror(3, -10, w,h));
	return ret;
}

(async ()=>{
	let img = await sharp('img.png').greyscale().ensureAlpha();
	await sharp('img.png').greyscale().ensureAlpha().median().toFile('output/delete.png');
	let meta = await img.metadata(), w = meta.width, h = meta.height;
	let data = await img.raw().toBuffer();
	await sharp(data, {
		raw:{
				width: meta.width,
				height: meta.height,
				channels: 1
			}
		}).toFile('output/grey.png');
	
	await sharp(localThreshold(await sharp('img.png').greyscale().ensureAlpha().raw().toBuffer(), w, h), {
		raw:{
				width: meta.width,
				height: meta.height,
				channels: 1
			}
		}).toFile('output/wmf.png');
	
	
	let cp = data.slice();
	for(let i = 1; i < h-1; i++){
		for(let j = 1; j < w-1; j++){
			let toMed = [];
			toMed.push(data[w*i+j]);
			toMed.push(data[w*i+j-1]);
			toMed.push(data[w*i+j+1]);
			toMed.push(data[w*i+j-1]);
			toMed.push(data[w*i+j+1]);
			toMed.push(data[w*i+j-1-w]);
			toMed.push(data[w*i+j-1+w]);
			toMed.push(data[w*i+j+1-w]);
			toMed.push(data[w*i+j+1+w]);
			toMed.push(data[w*i+j-w]);
			toMed.push(data[w*i+j+w]);
			toMed.push(data[w*i+j-w]);
			toMed.push(data[w*i+j+w]);
			data[w*i+j] = getMedium(toMed,0);
		}
	}
	data = cp;
	await sharp(data, {
		raw:{
				width: meta.width,
				height: meta.height,
				channels: 1
			}
		}).toFile('output/outPre.png')
	
	
	let visited = new Array(data.length).fill(false);
	let q = [];
	let delta = 5;//gradually not so steep!
	
	let guids = new Array(w*h).fill(0), guid = 1;
	let guidSizes = new Array(w*h).fill(0)
	let guidColors = new Array(w*h).fill(0);
	let guidToDelete = new Array(w*h).fill(false);
	for(let i = 0; i < data.length; i++){
		if(i%(data.length/100|1) == 0)process.stdout.write(Math.floor(100*i/data.length) + "%\r");
		if(visited[i])continue;
		q.push(i);
		
		let size = 0, cls = [];
		while(q.length){
			let e = q.pop();
			let v = data[e];
			visited[e] = true;
			cls.push(v);
			guids[e] = guid;
			if(Math.floor(e/w) == 0 || Math.floor(e/w) == h-1 || e%w == 0 || e%w == w-1)guidToDelete[guid] = true;
			size++;
			if(e + 1 < data.length && !visited[e+1] && Math.floor(e/w) ==  Math.floor((e+1)/w) && Math.abs(data[e + 1] - v) <= delta) q.push(e + 1);		
			if(e - 1 >= 0 && !visited[e-1] && Math.floor(e/w) == Math.floor((e-1)/w) && Math.abs(data[e - 1] - v) <= delta) q.push(e - 1);
			if(e + w < data.length && !visited[e+w] && Math.abs(data[e + w] - v) <= delta) q.push(e + w);
			if(e - w >= 0 && !visited[e-w] && Math.abs(data[e - w] - v) <= delta) q.push(e - w);
		}
		//guidColors[guid] = getMedium(cls, 30);
		guidColors[guid] = cls[0];
		guidSizes[guid++] = size;
	}
	
	for(let i = 0; i < data.length; i++){
		if(guids[i] != 0){
			/*if(guidSizes[guids[i]] > 1)*/
			data[i] = guidColors[guids[i]];
			
		}
	}
	/*for(let i = 0; i < h; i++){
		for(let j = 0; j < w; j++){
			
		}
	}*/
	
	let hist = new Array(256).fill(0),
		histLen = 0;
	for(let i = 0; i < data.length; i+=1){
		hist[data[i]]++;
		histLen++;
	}
	
	let max = 0;
	for(let i = 0; i < 256; i++)max = Math.max(max, hist[i]);
	
	
	let b = new Board(256,50);
	
	for(let i = 0; i < 256; i++){
		hist[i] /= max;
		let str = "";
		for(let j = 2; j < Math.min(hist[i]*48+2, 50); j++)b.m[j][i] = '█';
		b.m[0][i] = i.toString().substr(-1);
		b.m[1][i] = i % 10 == 0 ? (i/10).toString().substr(-1) : " ";
	}
	
	b.print();
	
	await sharp(data, {
		raw:{
				width: meta.width,
				height: meta.height,
				channels: 1
			}
		}).toFile('output/out.png')
	sharp({
	  create: {
		width: w,
		height: h*3,
		channels: 4,
		background: 0
	  }
	})
	.composite([
		{ input: 'output/grey.png', gravity: 'north' },
		{ input: 'output/outPre.png', gravity: 'center' },
		{ input: 'output/out.png', gravity: 'south' }
		]).toFile('output/combo.png')
		
	sharp({
	  create: {
		width: w,
		height: h*2,
		channels: 4,
		background: 0
	  }
	})
	.composite([
		{ input: 'output/grey.png', gravity: 'north' },
		{ input: 'output/delete.png', gravity: 'south' }
		]).toFile('output/delete2.png')
})();