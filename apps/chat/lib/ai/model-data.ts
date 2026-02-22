export type ModelData = {
  id: string;
  object: string;
  owned_by: string;
  name: string;
  description: string;
  type: "language" | "embedding" | "image" | "video";
  tags?: string[];
  context_window: number;
  max_tokens: number;
  pricing: {
    input?: string;
    output?: string;
    input_cache_read?: string;
    input_cache_write?: string;
    web_search?: string;
    image?: string;
  };
  reasoning: boolean;
  toolCall: boolean;
  input: {
    image: boolean;
    text: boolean;
    pdf: boolean;
    video: boolean;
    audio: boolean;
  };
  output: {
    image: boolean;
    text: boolean;
    audio: boolean;
    video: boolean;
  };
};
