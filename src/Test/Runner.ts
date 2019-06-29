import * as API from '../API';
import { ILogger } from './Logger';
import { SpecOverrider } from './SpecOverrider';
import { Resource } from './Resource';

export class Runner {
	constructor(protected spec: API.Spec, protected logger: ILogger, protected override: SpecOverrider) {
		logger.testingProject(spec.getProjectInfo());
	}

	async test(host: string, resource: string, requestContentType: string, responseStatus: number, responseContentType: string): Promise<boolean> {
		try {
			let specHost: API.Spec.Host;

			if (host) {
				specHost = this.spec.getHost(host);
			} else {
				this.logger.usingDefaultHost();
				specHost = this.spec.getHost(0);
			}

			if (! resource) {
				console.log(`Please specify a name of the API host to use for testing.`);
				this.printResources();
				return false;
			}

			this.logger.usingHost(specHost);

			let specRes = this.spec.getResource(resource);
			let resT = new Resource(specHost, specRes, this.logger, this.override);
			return await resT.test(requestContentType, responseStatus, responseContentType);
		} catch (err) {
			if (err instanceof API.Spec.ResourceNotFoundError) {
				console.log(err.message);
				this.printResources();
			} else {
				console.log(`Better luck next time.`);
				console.log(err);
			}
		}
	}

	printResources() {
		if (this.spec) {
			let resources = this.spec.getResources();
			console.log("Available operations:");
			
			for (let r of resources) {
				console.log('\t' + r.name);
				console.log('\t' + r.method.toLocaleUpperCase() + ' ' + r.path);
				console.log('');
			}
		}
	}
}