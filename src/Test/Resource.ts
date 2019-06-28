import * as API from '../API';
import * as request from 'request';
import { Security } from "./Security";
import { Response } from './Response';
import * as _ from 'lodash';
import { Test } from './Test';
import { ILogger } from './Logger';
import { SpecOverrider } from './SpecOverrider';

export class Resource extends Test{
	constructor(protected host: API.Spec.Host, protected res: API.Spec.Resource, logger: ILogger, protected override: SpecOverrider) {
		super(logger);
	}

	async test(requestContentType: string, responseStatus: number, responseContentType: string) {
		this.logger.testingResource(this.res);
		this.logger.usingSecurity(this.res.security);

		let result = false;

		try {
			let opts: request.Options = {
				url: this.host.url + this.res.path,
				headers: {},
				method: this.res.method,
				followAllRedirects: false,
				followRedirect: false,
			};
	
			//	In case of POST fetching and using a schema for request
			if (this.res.method === 'POST') {
				let specReq = this.getRequest(requestContentType);
				this.logger.usingRequest(specReq);
				opts.body = JSON.stringify(specReq.schema.example);
				opts.headers['Content-Type'] = specReq.contentType;
			}
	
			//	Attaching headers
			if (this.res.headers) {
				API.Spec.HeaderBag.applyToRequest(this.res.headers, opts);
			}
			
			//	Authorizing the request
			this.override.security(this.res.security);
			Security.make(this.res.security).authorizeRequest(opts);
			
			//	A schema used to validate the response
			let specResp = this.getResponse(responseStatus, responseContentType)
			this.logger.usingResponse(specResp);
	
			let resp = await this.request(opts);
	
			let respT = Response.make(specResp, this.logger);
	
			result = respT.test(resp);
	
			
		} catch (err) {
			this.logger.error(err);	
		}
		
		if (result) {
			this.logger.resourceOK(this.res);
		} else {
			this.logger.resourceFail(this.res);
		}

		return result;
	}

	getRequest(requestContentType: string): API.Spec.Request {
		let specReq: API.Spec.Request;
		
		if (requestContentType === '*') {
			specReq = this.res.requests[0];
		} else {
			specReq = this.res.requests.filter((r) => (r.contentType == requestContentType))[0];
		}

		if (! specReq) {
			throw new Error(`Couldn't find a '${requestContentType}' request.`);
		}

		if (! specReq.schema.example) {
			throw new Error(`The request schema '${specReq.schema.name}' contains no suitable example to use.`);
		}

		return specReq;
	}

	getResponse(responseStatus?: number, responseContentType?: string): API.Spec.Response {
		let filterCT = (r) => (r.contentType === responseContentType);
		let filterStatus = (r) => (r.statusCode == responseStatus);

		if (!responseStatus) {
			filterStatus = (r) => true;
		}

		if (!responseContentType || responseContentType === '*') {
			filterCT = (r) => true;
		}

		let specResp = _.filter(this.res.responses, (r) => filterCT(r) && filterStatus(r))[0];

		if (! specResp) {
			throw new Error(`Couldn't find a response with status of ${responseStatus} and Content-Type of '${responseContentType}'.`);
		}

		return specResp;
	}

	request(opts: request.Options) {
		return new Promise<request.Response>((resolve, reject) => {
			request(opts, (err, response, body) => {
				if (err) {
					return reject(err);
				} else {
					return resolve(response);
				}
			})
		});
	}
}
