import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { Spec } from './Spec';

export type LoaderFn = (spec: any) => Spec;

let loaders: {spec: any, loader: LoaderFn}[] = [];

export function addLoader(spec: any, loader: LoaderFn) {
	loaders.push({spec, loader});
}

export function load(path) {
	let doc = yaml.safeLoad(fs.readFileSync(path, 'utf8'));

	for (let l of loaders) {
		if (specFits(l.spec, doc)) {
			return l.loader(doc);
		}
	}

	throw new Error(`No loader was specified for the document.`);
}

function specFits(expected: any, actual: any) {
	for (let exFN in expected) {
		if (actual[exFN] === expected[exFN]) {
			return true;
		}
	}

	return false;
}

export * from './Spec';
export * from './SpecV2';
export * from './SpecV3';
