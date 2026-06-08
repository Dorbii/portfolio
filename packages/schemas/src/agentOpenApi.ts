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
      '/gpt/catalog': {
        post: {
          operationId: 'gptCatalog',
          summary: 'Fetch selected part summaries',
          description:
            'Request only the part ids needed to interpret current legal actions. This endpoint returns compact catalog summaries instead of embedding the full catalog in every packet.',
          requestBody: jsonRequestBody('GptCatalogRequest'),
          responses: gptCatalogResponses(),
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
              $ref: '#/components/schemas/GptActionParameters',
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
        GptActionParameters: {
          type: 'object',
          additionalProperties: true,
          description:
            'Optional parameters copied from the selected legal action parameterSchema. Include only fields required by that selected action.',
          properties: {
            childPartId: {
              type: 'string',
              description: 'propose_mount_pose only: catalog part id selected by the previous loadout step.',
            },
            parentInstanceId: {
              type: 'string',
              description: 'propose_mount_pose only: parent MachineDesign instance id selected by the previous loadout step.',
            },
            mountSurfaceId: {
              type: 'string',
              description: 'propose_mount_pose only: mount surface id exposed by the selected parent instance.',
            },
            u: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'propose_mount_pose only: normalized horizontal coordinate on the mount surface.',
            },
            v: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'propose_mount_pose only: normalized vertical coordinate on the mount surface.',
            },
            yawDegrees: {
              type: 'number',
              description: 'propose_mount_pose only: yaw in degrees; the server normalizes degrees.',
            },
            rollDegrees: {
              type: 'number',
              description: 'propose_mount_pose only: roll in degrees; the server normalizes degrees.',
            },
            destinationCellId: {
              type: 'string',
              description: 'combat move and move_and_attack only: exact destination cell id from the selected action.',
            },
            targetId: {
              type: 'string',
              enum: ['opponent'],
              description: 'combat attack and move_and_attack only: server-authored target id.',
            },
            targetCellId: {
              type: 'string',
              description: 'combat attack and move_and_attack only: exact target cell id from the selected action.',
            },
            sourceCellId: {
              type: 'string',
              description: 'combat utility only: exact source cell id from the selected action.',
            },
          },
          examples: [
            {
              childPartId: 'Laser_A',
              parentInstanceId: 'core',
              mountSurfaceId: 'core_shell',
              u: 0.37,
              v: 0.82,
              yawDegrees: 120,
              rollDegrees: 15,
            },
            {
              destinationCellId: 'cell:5:2',
              targetId: 'opponent',
              targetCellId: 'cell:5:6',
            },
          ],
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
        GptCatalogRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['inviteUrl', 'partIds'],
          properties: {
            inviteUrl: inviteUrlSchema(),
            partIds: {
              type: 'array',
              minItems: 1,
              maxItems: 24,
              items: {
                type: 'string',
                minLength: 1,
              },
              description: 'Part ids from packet legal action context that need catalog details.',
            },
          },
        },
        GptCatalogPartSummary: {
          type: 'object',
          additionalProperties: true,
          required: ['id', 'category', 'displayName', 'cost', 'mass', 'durability', 'size', 'stats', 'tags'],
          properties: {
            id: { type: 'string' },
            category: { type: 'string' },
            displayName: { type: 'string' },
            cost: { type: 'number' },
            mass: { type: 'number' },
            durability: { type: 'number' },
            size: {
              type: 'object',
              additionalProperties: true,
            },
            controls: {
              type: 'object',
              additionalProperties: true,
            },
            stats: {
              type: 'object',
              additionalProperties: true,
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
            behavior: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
        GptCatalogResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['parts'],
          properties: {
            parts: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/GptCatalogPartSummary',
              },
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

function gptCatalogResponses() {
  return {
    '200': {
      description: 'Selected compact part summaries.',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/GptCatalogResponse',
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
