// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: string;
				username: string;
				avatarUrl: string | null;
				guildPermissions: Array<{
					guildId: string;
					permissions: string;
				}>;
			} | null;
		}

		interface PageData {
			user: Locals['user'];
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
