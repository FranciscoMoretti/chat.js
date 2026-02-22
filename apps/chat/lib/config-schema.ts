import { z } from "zod";
import type {
  GatewayImageModelIdMap,
  GatewayModelIdMap,
  GatewayType,
  GatewayVideoModelIdMap,
} from "@/lib/ai/gateways/registry";
import type { ToolName } from "./ai/types";

const DEFAULT_GATEWAY = "vercel" as const satisfies GatewayType;

// Helper to create typed model ID schemas
const toolName = () => z.custom<ToolName>();

// =====================================================
// Models config — discriminated union keyed on gateway
// =====================================================

function gatewayModelId<G extends GatewayType>() {
  return z.custom<GatewayModelIdMap[G]>((v) => typeof v === "string");
}

function gatewayImageModelId<G extends GatewayType>() {
  return z.custom<GatewayImageModelIdMap[G]>((v) => typeof v === "string");
}

function gatewayVideoModelId<G extends GatewayType>() {
  return z.custom<GatewayVideoModelIdMap[G]>((v) => typeof v === "string");
}

function createModelsSchema<G extends GatewayType>(g: G) {
  return z.object({
    gateway: z.literal(g),
    providerOrder: z
      .array(z.string())
      .describe("Provider sort order in model selector"),
    disabledModels: z
      .array(gatewayModelId<G>())
      .describe("Models to hide from all users"),
    curatedDefaults: z
      .array(gatewayModelId<G>())
      .describe("Default models enabled for new users"),
    anonymousModels: z
      .array(gatewayModelId<G>())
      .describe("Models available to anonymous users"),
    defaults: z
      .object({
        chat: gatewayModelId<G>(),
        title: gatewayModelId<G>(),
        pdf: gatewayModelId<G>(),
        artifact: gatewayModelId<G>(),
        artifactSuggestion: gatewayModelId<G>(),
        followupSuggestions: gatewayModelId<G>(),
        suggestions: gatewayModelId<G>(),
        polishText: gatewayModelId<G>(),
        formatSheet: gatewayModelId<G>(),
        analyzeSheet: gatewayModelId<G>(),
        codeEdits: gatewayModelId<G>(),
        chatImageCompatible: gatewayModelId<G>(),
        image: gatewayImageModelId<G>(),
        video: gatewayVideoModelId<G>(),
        deepResearch: gatewayModelId<G>(),
        deepResearchFinalReport: gatewayModelId<G>(),
      })
      .describe("Default model for each task type"),
  });
}

// Record ensures a compile error if a new gateway is added but not here.
const gatewaySchemaMap: {
  [G in GatewayType]: ReturnType<typeof createModelsSchema<G>>;
} = {
  vercel: createModelsSchema("vercel"),
  openrouter: createModelsSchema("openrouter"),
  openai: createModelsSchema("openai"),
  "openai-compatible": createModelsSchema("openai-compatible"),
};

export const modelsConfigSchema = z
  .discriminatedUnion("gateway", [
    gatewaySchemaMap.vercel,
    gatewaySchemaMap.openrouter,
    gatewaySchemaMap.openai,
    gatewaySchemaMap["openai-compatible"],
  ])
  .default({
    gateway: DEFAULT_GATEWAY,
    providerOrder: ["openai", "google", "anthropic"],
    disabledModels: [],
    curatedDefaults: [
      // OpenAI
      "openai/gpt-5-nano",
      "openai/gpt-5-mini",
      "openai/gpt-5.2",
      "openai/gpt-5.2-chat",

      // Google
      "google/gemini-2.5-flash-lite",
      "google/gemini-3-flash",
      "google/gemini-3-pro-preview",
      // Anthropic
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-opus-4.5",
      // xAI
      "xai/grok-4",
    ],
    anonymousModels: ["google/gemini-2.5-flash-lite", "openai/gpt-5-nano"],
    defaults: {
      chat: "openai/gpt-5-mini",
      title: "openai/gpt-5-nano",
      pdf: "openai/gpt-5-mini",
      artifact: "openai/gpt-5-nano",
      artifactSuggestion: "openai/gpt-5-mini",
      followupSuggestions: "google/gemini-2.5-flash-lite",
      suggestions: "openai/gpt-5-mini",
      polishText: "openai/gpt-5-mini",
      formatSheet: "openai/gpt-5-mini",
      analyzeSheet: "openai/gpt-5-mini",
      codeEdits: "openai/gpt-5-mini",
      chatImageCompatible: "openai/gpt-4o-mini",
      image: "google/gemini-3-pro-image",
      video: "xai/grok-imagine-video",
      deepResearch: "google/gemini-2.5-flash-lite",
      deepResearchFinalReport: "google/gemini-3-flash",
    },
  });

export const pricingConfigSchema = z.object({
  currency: z.string().optional(),
  free: z
    .object({
      name: z.string(),
      summary: z.string(),
    })
    .optional(),
  pro: z
    .object({
      name: z.string(),
      monthlyPrice: z.number(),
      summary: z.string(),
    })
    .optional(),
});

export const anonymousConfigSchema = z
  .object({
    credits: z.number().describe("Message credits for anonymous users"),
    availableTools: z
      .array(toolName())
      .describe("Tools available to anonymous users"),
    rateLimit: z
      .object({
        requestsPerMinute: z.number(),
        requestsPerMonth: z.number(),
      })
      .describe("Rate limits"),
  })
  .default({
    credits: 10,
    availableTools: [],
    rateLimit: {
      requestsPerMinute: 5,
      requestsPerMonth: 10,
    },
  });

export const attachmentsConfigSchema = z
  .object({
    maxBytes: z.number().describe("Max file size in bytes after compression"),
    maxDimension: z.number().describe("Max image dimension"),
    acceptedTypes: z
      .object({
        "image/png": z.array(z.string()),
        "image/jpeg": z.array(z.string()),
        "application/pdf": z.array(z.string()),
      })
      .describe("Accepted MIME types with their file extensions"),
  })
  .default({
    maxBytes: 1024 * 1024,
    maxDimension: 2048,
    acceptedTypes: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
  });

export const deepResearchConfigSchema = z
  .object({
    allowClarification: z
      .boolean()
      .describe("Whether to ask clarifying questions before starting research"),
    maxResearcherIterations: z
      .number()
      .int()
      .min(1)
      .max(10)
      .describe("Maximum supervisor loop iterations"),
    maxConcurrentResearchUnits: z
      .number()
      .int()
      .min(1)
      .max(20)
      .describe("Topics researched in parallel per iteration"),
    maxSearchQueries: z
      .number()
      .int()
      .min(1)
      .max(10)
      .describe("Max search queries per research topic"),
  })
  .default({
    allowClarification: true,
    maxResearcherIterations: 1,
    maxConcurrentResearchUnits: 2,
    maxSearchQueries: 2,
  });

export const featuresConfigSchema = z
  .object({
    sandbox: z.boolean().describe("Code sandbox execution (Vercel-native)"),
    webSearch: z.boolean().describe("Web search (requires TAVILY_API_KEY)"),
    urlRetrieval: z
      .boolean()
      .describe("URL content retrieval (requires FIRECRAWL_API_KEY)"),
    deepResearch: z
      .boolean()
      .describe("Deep research agent (requires webSearch)"),
    mcp: z.boolean().describe("MCP tool servers (requires MCP_ENCRYPTION_KEY)"),
    imageGeneration: z
      .boolean()
      .describe("AI image generation (requires BLOB_READ_WRITE_TOKEN)"),
    videoGeneration: z
      .boolean()
      .describe("AI video generation (requires BLOB_READ_WRITE_TOKEN)"),
    attachments: z
      .boolean()
      .describe("File attachments (requires BLOB_READ_WRITE_TOKEN)"),
    followupSuggestions: z
      .boolean()
      .describe("Follow-up question suggestions after AI responses"),
  })
  .default({
    sandbox: false,
    webSearch: false,
    urlRetrieval: false,
    deepResearch: false,
    mcp: false,
    imageGeneration: false,
    videoGeneration: false,
    attachments: false,
    followupSuggestions: false,
  });

export const authenticationConfigSchema = z
  .object({
    google: z
      .boolean()
      .describe("Google OAuth (requires AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET)"),
    github: z
      .boolean()
      .describe("GitHub OAuth (requires AUTH_GITHUB_ID + AUTH_GITHUB_SECRET)"),
    vercel: z
      .boolean()
      .describe(
        "Vercel OAuth (requires VERCEL_APP_CLIENT_ID + VERCEL_APP_CLIENT_SECRET)"
      ),
  })
  .default({
    google: false,
    github: true,
    vercel: false,
  });

export const configSchema = z.object({
  appPrefix: z.string().default("chatjs"),
  appName: z.string().default("My AI Chat"),
  appTitle: z
    .string()
    .optional()
    .describe("Browser tab title (defaults to appName)"),
  appDescription: z.string().default("AI chat powered by ChatJS"),
  appUrl: z.url().default("https://your-domain.com"),

  organization: z
    .object({
      name: z.string(),
      contact: z.object({
        privacyEmail: z.string().email(),
        legalEmail: z.string().email(),
      }),
    })
    .default({
      name: "Your Organization",
      contact: {
        privacyEmail: "privacy@your-domain.com",
        legalEmail: "legal@your-domain.com",
      },
    }),

  services: z
    .object({
      hosting: z.string(),
      aiProviders: z.array(z.string()),
      paymentProcessors: z.array(z.string()),
    })
    .default({
      hosting: "Vercel",
      aiProviders: ["OpenAI", "Anthropic", "Google"],
      paymentProcessors: [],
    }),

  features: featuresConfigSchema,

  pricing: pricingConfigSchema.optional(),

  legal: z
    .object({
      minimumAge: z.number(),
      governingLaw: z.string(),
      refundPolicy: z.string(),
    })
    .default({
      minimumAge: 13,
      governingLaw: "United States",
      refundPolicy: "no-refunds",
    }),

  policies: z
    .object({
      privacy: z.object({
        title: z.string(),
        lastUpdated: z.string().optional(),
      }),
      terms: z.object({
        title: z.string(),
        lastUpdated: z.string().optional(),
      }),
    })
    .default({
      privacy: { title: "Privacy Policy" },
      terms: { title: "Terms of Service" },
    }),

  authentication: authenticationConfigSchema,

  models: modelsConfigSchema,

  anonymous: anonymousConfigSchema,

  attachments: attachmentsConfigSchema,

  deepResearch: deepResearchConfigSchema,
});

// Output types (after defaults applied)
export type Config = z.infer<typeof configSchema>;
export type PricingConfig = z.infer<typeof pricingConfigSchema>;
export type ModelsConfig = z.infer<typeof modelsConfigSchema>;
export type AnonymousConfig = z.infer<typeof anonymousConfigSchema>;
export type AttachmentsConfig = z.infer<typeof attachmentsConfigSchema>;
export type DeepResearchConfig = z.infer<typeof deepResearchConfigSchema>;
export type FeaturesConfig = z.infer<typeof featuresConfigSchema>;
export type AuthenticationConfig = z.infer<typeof authenticationConfigSchema>;

// Gateway-aware input types: model IDs narrowed per gateway for autocomplete
type ZodConfigInput = z.input<typeof configSchema>;

// Use vercel variant as shape reference (all variants share the same structure)
type ModelsShape = z.input<typeof gatewaySchemaMap.vercel>;

type ModelsInputFor<G extends GatewayType> = {
  [K in keyof ModelsShape]: K extends "gateway"
    ? G
    : K extends "defaults"
      ? {
          [D in keyof ModelsShape["defaults"]]: D extends "image"
            ? GatewayImageModelIdMap[G]
            : D extends "video"
              ? GatewayVideoModelIdMap[G]
              : GatewayModelIdMap[G];
        }
      : K extends "disabledModels" | "curatedDefaults" | "anonymousModels"
        ? GatewayModelIdMap[G][]
        : ModelsShape[K];
};

type ConfigInputForGateway<G extends GatewayType> = Omit<
  ZodConfigInput,
  "models"
> & {
  models?: ModelsInputFor<G>;
};

export type ConfigInput = {
  [G in GatewayType]: ConfigInputForGateway<G>;
}[GatewayType];

// Apply defaults to partial config
export function applyDefaults(input: ConfigInput): Config {
  return configSchema.parse(input);
}
