import {
  acceptedContent,
  inputRequired,
  inputResponse,
  type ServerContext,
} from '@modelcontextprotocol/server';
import { z } from 'zod';

const CONFIRM_KEY = 'confirm';

const confirmationSchema = z.object({
  confirm: z.boolean().describe('Run this operation'),
});

// Written once against `inputRequired`: on 2025-era connections the SDK's legacy shim turns it
// into an `elicitation/create` request and re-enters the handler with the answer.
export function withConfirmation<A extends Record<string, unknown>, R>(
  toolName: string,
  handler: (args: A, ctx: ServerContext) => Promise<R>
) {
  return async (args: A, ctx: ServerContext) => {
    const responses = ctx.mcpReq.inputResponses;

    if (inputResponse(responses, CONFIRM_KEY).kind === 'missing') {
      return inputRequired({
        inputRequests: {
          [CONFIRM_KEY]: inputRequired.elicit({
            message: `Run ${toolName}?\n\n${JSON.stringify(args, null, 2)}`,
            requestedSchema: confirmationSchema,
          }),
        },
      });
    }

    if (
      acceptedContent(responses, CONFIRM_KEY, confirmationSchema)?.confirm !==
      true
    ) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `${toolName} was not run: the user did not confirm it.`,
          },
        ],
      };
    }

    return handler(args, ctx);
  };
}
