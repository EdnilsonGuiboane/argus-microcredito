export type TemplateVariables = Record<string, string | number | null | undefined>;

export class MessageRenderService {
  render(template: string, variables: TemplateVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(placeholder, value == null ? '' : String(value));
    }

    return result;
  }
}

export const messageRenderService = new MessageRenderService();