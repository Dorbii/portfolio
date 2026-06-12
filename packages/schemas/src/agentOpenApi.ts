export type AgentActionsOpenApiOptions = {
  apiBase?: string
}

export function createAgentActionsOpenApi(options: AgentActionsOpenApiOptions = {}) {
  const apiBase = options.apiBase ?? 'https://arena-api.dorbii.net'

  return {
    openapi: '3.1.0',
    info: {
      title: 'Clash of Clankers GPT Actions API',
      version: '0.2.1-gamemaster',
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
          'x-openai-isConsequential': false,
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
          'x-openai-isConsequential': false,
          summary: 'Fetch the latest GPT-friendly packet status',
          description:
            'Poll this when the role is waiting. Follow the continuation hint to keep playing until complete or expired. Post-fight packets can include packet.review and packet.sharedDebrief; live combat packets include fightStartedAt, fightDeadlineAt, fightSeconds, and cutoffReason when available.',
          requestBody: jsonRequestBody('GptNextRequest'),
          responses: gptResponses('Latest role status and GameMaster packet.'),
        },
      },
      '/gpt/act': {
        post: {
          operationId: 'gptAct',
          'x-openai-isConsequential': false,
          summary: 'Submit one GPT action or combat round plan',
          description:
            'During build, submit one compact action (no actionId needed), e.g. {"action":{"kind":"choose_part","part":"weapon.Weapon_Turret"}}; use {"action":{"kind":"cancel_build_selection"}} to back out of the current build selection when packet.build.edit.cancel is true. During combat, use actionId combat_plan with parameters.steps; the server fills round and decisionVersion and resolves both submitted plans in lockstep substeps. Legacy actionId submissions copied from packet.legalActions remain accepted during migration. Provide exactly one of action or actionId.',
          requestBody: jsonRequestBody('GptActRequest'),
          responses: gptResponses('Accepted action result and next packet.'),
        },
      },
      '/gpt/reflection': {
        post: {
          operationId: 'gptReflection',
          'x-openai-isConsequential': false,
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
          'x-openai-isConsequential': false,
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
          required: ['inviteUrl'],
          oneOf: [
            { required: ['inviteUrl', 'action'] },
            { required: ['inviteUrl', 'actionId'] },
          ],
          properties: {
            inviteUrl: inviteUrlSchema(),
            action: {
              $ref: '#/components/schemas/CompactBuildAction',
            },
            actionId: {
              type: 'string',
              minLength: 1,
              description: 'Legacy compatibility: exact id copied from packet.legalActions, or combat_plan during combat.',
            },
            parameters: {
              $ref: '#/components/schemas/GptActionParameters',
              description:
                'Parameters for the selected action only when that legal action exposes parameterSchema. If omitted, the GPT wrapper uses the selected legal action parameterExamples when available.',
            },
            publicMessage: {
              type: 'string',
              maxLength: 240,
              description: 'Optional display-only message. Do not include secrets or hidden reasoning.',
            },
          },
        },
        CompactBuildAction: {
          type: 'object',
          additionalProperties: true,
          required: ['kind'],
          description:
            'Compact build action for the build phase. kind selects the shape: choose_part {part: alias like weapon.Weapon_Turret}, choose_attach_target {target: part instance id from packet.build.targets}, mount_part {surface, u, v, yaw?, roll?} copied from packet.build.mounts rows, remove_part/remove_subtree/move_part {id}, rotate_part {id, rot}, cancel_build_selection {}, confirm_loadout {}.',
          properties: {
            kind: {
              type: 'string',
              enum: [
                'choose_part',
                'choose_attach_target',
                'mount_part',
                'remove_part',
                'remove_subtree',
                'move_part',
                'rotate_part',
                'cancel_build_selection',
                'confirm_loadout',
              ],
              description: 'Compact build action kind.',
            },
            part: {
              type: 'string',
              description: 'choose_part only: category-prefixed part alias from packet.build.store, e.g. weapon.Weapon_Turret.',
            },
            target: {
              type: 'string',
              description: 'choose_attach_target only: target instance id from packet.build.targets.',
            },
            id: {
              type: 'string',
              description: 'remove_part, remove_subtree, move_part, rotate_part: existing part instance id from packet.build.bot.parts.',
            },
            rot: {
              type: 'number',
              description: 'rotate_part only: rotation value from packet.build.edit.rotate[].rot.',
            },
            surface: {
              type: 'string',
              description: 'mount_part only: surface id from packet.build.mounts rows.',
            },
            u: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'mount_part only: normalized horizontal mount coordinate.',
            },
            v: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'mount_part only: normalized vertical mount coordinate.',
            },
            yaw: {
              type: 'number',
              description: 'mount_part only: optional yaw in degrees, default 0.',
            },
            roll: {
              type: 'number',
              description: 'mount_part only: optional roll in degrees, default 0.',
            },
          },
        },
        GptActionParameters: {
          type: 'object',
          additionalProperties: true,
          description:
            'Optional parameters for legacy selected legal actions or for actionId combat_plan. Include only fields required by the selected path.',
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
              description: 'legacy actionId compatibility only: exact destination cell id from the selected action.',
            },
            targetId: {
              type: 'string',
              enum: ['opponent'],
              description: 'combat attack and move_and_attack only: server-authored target id.',
            },
            targetCellId: {
              type: 'string',
              description: 'legacy actionId compatibility, or combat_plan attack alias: target cell id such as cell:5:6.',
            },
            sourceCellId: {
              type: 'string',
              description: 'legacy actionId compatibility only: exact source cell id from the selected action.',
            },
            steps: {
              type: 'array',
              maxItems: 16,
              description:
                'combat_plan only: current-round compact steps. Read packet.combat.combat for budget/self/opponent and packet.combat.board for grid/terrain. Use move to:[x,z], attack target:[x,z], utility at:[x,z], or end_turn. This is not a future-turn queue.',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['kind'],
                properties: {
                  kind: {
                    type: 'string',
                    enum: ['move', 'attack', 'utility', 'end_turn'],
                    description: 'Intent step kind consumed by the lockstep round resolver.',
                  },
                  cellId: {
                    type: 'string',
                    description: 'compatibility alias for move or utility destination, such as cell:3:0.',
                  },
                  to: {
                    type: 'array',
                    minItems: 2,
                    maxItems: 2,
                    items: { type: 'integer' },
                    description: 'move only: compact destination coordinate tuple [x,z].',
                  },
                  targetCellId: {
                    type: 'string',
                    description: 'compatibility alias for attack target cell id, such as cell:5:6.',
                  },
                  target: {
                    type: 'array',
                    minItems: 2,
                    maxItems: 2,
                    items: { type: 'integer' },
                    description: 'attack only: compact target coordinate tuple [x,z].',
                  },
                  weaponSlot: {
                    type: 'string',
                    enum: ['weaponA', 'weaponB'],
                    description: 'attack weapon slot.',
                  },
                  utilityId: {
                    type: 'string',
                    description: 'compatibility alias for utility identifier.',
                  },
                  utility: {
                    type: 'string',
                    description: 'utility only: compact utility identifier.',
                  },
                  at: {
                    type: 'array',
                    minItems: 2,
                    maxItems: 2,
                    items: { type: 'integer' },
                    description: 'utility only: compact coordinate tuple [x,z].',
                  },
                },
              },
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
              steps: [
                { kind: 'move', to: [1, 0] },
                { kind: 'attack', weaponSlot: 'weaponA', target: [2, 0] },
                { kind: 'end_turn' },
              ],
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
        GptContinuationHint: {
          type: 'object',
          additionalProperties: false,
          required: ['keepGoing', 'recommendedNextCall', 'instruction'],
          properties: {
            keepGoing: {
              type: 'boolean',
              description:
                'True when the GPT should keep using actions for the same invite without asking the user for the next step.',
            },
            recommendedNextCall: {
              type: 'string',
              enum: ['gptNext', 'gptAct', 'gptReflection', 'stop'],
              description:
                'The next GPT action the model should prefer after reading this response.',
            },
            pollAfterMs: {
              type: 'integer',
              minimum: 0,
              description:
                'Suggested delay before polling gptNext again when the current role is waiting.',
            },
            instruction: {
              type: 'string',
              description:
                'Short continuation instruction for the Custom GPT. This is a hint, not a guaranteed autonomous loop.',
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
                'Current GPT packet. During build, use packet.build, including packet.build.edit.cancel for cancel_build_selection. During combat, use packet.combat.combat and packet.combat.board; compact combat packets omit legalActions and raw board affordance arrays and include fightStartedAt, fightDeadlineAt, fightSeconds, and cutoffReason when available. Post-fight packets can include packet.review and packet.sharedDebrief. packet.legalActions appears only on compatibility surfaces.',
            },
            continuation: {
              $ref: '#/components/schemas/GptContinuationHint',
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
