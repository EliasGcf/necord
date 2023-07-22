import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { Client, Collection } from 'discord.js';
import { TextCommandDiscovery } from './text-command.discovery';
import { NECORD_MODULE_OPTIONS, TEXT_COMMAND_METADATA } from '../necord.constants';
import { ExplorerService } from '../necord-explorer.service';
import { NecordModuleOptions } from '../necord-options.interface';

@Injectable()
export class TextCommandsService {
	private readonly logger = new Logger(TextCommandsService.name);

	public readonly cache = new Collection<string, TextCommandDiscovery>();

	public constructor(
		@Inject(NECORD_MODULE_OPTIONS)
		private readonly options: NecordModuleOptions,
		private readonly client: Client,
		private readonly explorerService: ExplorerService<TextCommandDiscovery>
	) {}

	private onModuleInit() {
		return this.explorerService
			.explore(TEXT_COMMAND_METADATA)
			.forEach(textCommand => this.add(textCommand));
	}

	private onApplicationBootstrap() {
		return this.client.on('messageCreate', async message => {
			if (!message || !message.content?.length || message.webhookId || message.author.bot)
				return;

			const content = message.content.toLowerCase();
			const prefix =
				typeof this.options.prefix !== 'function'
					? this.options.prefix ?? '!'
					: await this.options.prefix(message);

			if (!prefix || !content.startsWith(prefix)) return;

			const args = content.substring(prefix.length).split(/ +/g);
			const cmd = args.shift();

			if (!cmd) return;

			return this.get(cmd)?.execute([message]);
		});
	}

	public add(textCommand: TextCommandDiscovery) {
		const name = textCommand.getName();

		if (this.cache.has(name)) {
			this.logger.warn(`TextCommand : ${name} already exists`);
		}

		this.cache.set(name, textCommand);
	}

	public get(name: string) {
		return this.cache.get(name);
	}

	public remove(name: string) {
		this.cache.delete(name);
	}
}
