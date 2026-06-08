export type AgentActionsOpenApiOptions = {
  apiBase?: string
}

export function createAgentActionsOpenApi(options: AgentActionsOpenApiOptions = {}) {
  const apiBase = options.apiBase ?? 'https://arena-api.dorbii.net'

  return {
    openapi: '3.1.0',
    info: {
      title: 'Clash of Clankers GPT Actions API',
      version: '0.2.0-gamemaster',
      description:
        'Import this schema into a Custom GPT Actions configuration. Use only these /gpt endpoints from a Custom GPT; do not execute browser helper JavaScript.',
    },
    servers: [
      { url: apiBase },
    ],
    paths: {
      '/gpt/claim': {
        post: {
          operationId: 'gptClaim',
          summary: 'Claim and bootstrap a role from an invite URL',
          description:
            'Claim the role once using the invite URL, agent name, and generated team identity. The invite claim token stays inside the request body and is not exposed in public state.',
          requestBody: jsonRequestBody('GptClaimRequest'),
          responses: gptResponses('Claimed role and current GameMaster packet.'),
        },
      },
      '/gpt/next': {
        post: {
          operationId: 'gptNext',
          summary: 'Fetch the latest GPT-friendly packet status',
          description:
            'Poll this when the role is waiting. Continue only when status is playable, complete, or expired.',
          requestBody: jsonRequestBody('GptNextRequest'),
          responses: gptResponses('Latest role status and GameMaster packet.'),
        },
      },
      '/gpt/act': {
        post: {
          operationId: 'gptAct',
          summary: 'Submit one legal GameMaster action id',
          description:
            'Submit exactly one actionId copied from the latest packet. The server fills actionSetId and decisionVersion from current role state.',
          requestBody: jsonRequestBody('GptActRequest'),
          responses: gptResponses('Accepted action result and next packet.'),
        },
      },
      '/gpt/reflection': {
        post: {
          operationId: 'gptReflection',
          summary: 'Submit a private post-fight reflection',
          description:
            'Submit concise private post-fight claims only when the packet requests a reflection.',
          requestBody: jsonRequestBody('GptReflectionRequest'),
          responses: gptResponses('Accepted reflection result and next packet.'),
        },
      },
    },
    components: {
      schemas: {
        TeamIdentity: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'colorHex', 'logoPrompt'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 40,
              description: 'Team display name. Do not use Red Team or Blue Team as the identity.',
            },
            colorHex: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              description: 'Team accent color for the robot and UI label.',
            },
            logoPrompt: {
              type: 'string',
              minLength: 1,
              maxLength: 240,
              description: 'Text prompt describing the desired team logo.',
            },
          },
        },
        GptClaimRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['inviteUrl', 'agentName', 'teamIdentity'],
          properties: {
            inviteUrl: inviteUrlSchema(),
            agentName: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
              description: 'Agent/player name for the role claim.',
            },
            teamIdentity: {
              $ref: '#/components/schemas/TeamIdentity',
            },
          },
        },
        GptNextRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['inviteUrl'],
          properties: {
            inviteUrl: inviteUrlSchema(),
          },
        },
        GptActRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['inviteUrl', 'actionId'],
          properties: {
            inviteUrl: inviteUrlSchema(),
            actionId: {
              type: 'string',
              minLength: 1,
              description: 'Exact id copied from packet.legalActions.',
            },
            parameters: {
              type: 'object',
              additionalProperties: true,
              description:
                'Parameters for the selected action only when that legal action exposes parameterSchema.',
            },
            publicMessage: {
              type: 'string',
              maxLength: 240,
              description: 'Optional display-only message. Do not include secrets or hidden reasoning.',
            },
          },
        },
        GptReflectionClaims: {
          type: 'object',
          additionalProperties: false,
          required: ['ownWeaknesses', 'opponentThreats', 'suggestedDesignChanges', 'suggestedTacticalChanges'],
          properties: {
            ownWeaknesses: stringArraySchema('Weaknesses observed in this agent\'s bot or tactics.'),
            opponentThreats: stringArraySchema('Opponent strengths or threats observed in the fight.'),
            suggestedDesignChanges: stringArraySchema('Concrete design changes for the next build.'),
            suggestedTacticalChanges: stringArraySchema('Concrete tactical changes for the next fight.'),
          },
        },
        GptReflectionRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['inviteUrl', 'claims'],
          properties: {
            inviteUrl: inviteUrlSchema(),
            claims: {
              $ref: '#/components/schemas/GptReflectionClaims',
            },
            confidence: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Confidence in the reflection claims.',
            },
          },
        },
        GptResponse: {
          type: 'object',
          additionalProperties: true,
          properties: {
            status: {
              type: 'string',
              enum: ['claimed', 'playable', 'waiting', 'complete', 'expired'],
            },
            packet: {
              type: 'object',
              additionalProperties: true,
              description:
                'Current GameMasterPacket. Choose action ids only from packet.legalActions, and inspect packet.board.cells[].legal during combat.',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          additionalProperties: true,
          properties: {
            ok: { type: 'boolean' },
            error: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      },
    },
  }
}

function jsonRequestBody(schemaName: string) {
  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          $ref: `#/components/schemas/${schemaName}`,
        },
      },
    },
  }
}

function gptResponses(successDescription: string) {
  return {
    '200': {
      description: successDescription,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/GptResponse',
          },
        },
      },
    },
    default: {
      description: 'Rejected request with validation details.',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
        },
      },
    },
  }
}

function inviteUrlSchema() {
  return {
    type: 'string',
    format: 'uri',
    description:
      'Full agent invite URL containing session, role, claimToken, and api in the URL fragment.',
  }
}

function stringArraySchema(description: string) {
  return {
    type: 'array',
    description,
    items: { type: 'string' },
  }
}
