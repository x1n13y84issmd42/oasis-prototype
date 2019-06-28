import * as API from '../API';
import * as _ from 'lodash';

export class Data {
	static getTypeTester(type: API.Spec.DataType) {
		return {
			[API.Spec.DataType.String]: (v) => (v && v === v.toString()),
			[API.Spec.DataType.Object]: (v) => (_.isObject(v)),
			[API.Spec.DataType.Array]: (v) => (_.isArray(v)),
			[API.Spec.DataType.Boolean]: (v) => (v === !!v),
			[API.Spec.DataType.Number]: (v) => (_.isNumber(v)),
		}[type];
	}

	static map(pt: string) {
		return {
			'string': API.Spec.DataType.String,
			'object': API.Spec.DataType.Object,
			'array': API.Spec.DataType.Array,
			'boolean': API.Spec.DataType.Boolean,
			'number': API.Spec.DataType.Number,
		}[pt];
	}
}