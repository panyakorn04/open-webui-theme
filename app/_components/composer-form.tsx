import { memo, type FormEvent, type KeyboardEvent } from "react";
import { availableAiModels } from "../../lib/backend-chat-fetcher";
import { IconArrowUp, IconX } from "./icons";

const quickPrompts = [
    "ตรวจ docker compose ของ Open WebUI",
    "สรุป deployment checklist",
    "ช่วยเขียน n8n prompt สำหรับ highlight",
];

type ComposerFormProps = {
    prompt: string;
    onPromptChange: (nextPrompt: string) => void;
    isLoading: boolean;
    selectedModel: string;
    onSelectedModelChange: (nextModel: string) => void;
    onStopGeneration: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export const ComposerForm = memo(function ComposerForm({
    prompt,
    onPromptChange,
    isLoading,
    selectedModel,
    onSelectedModelChange,
    onStopGeneration,
    onSubmit,
    onKeyDown,
}: ComposerFormProps) {
    return (
        <form className="composer" onSubmit={onSubmit}>
            <textarea
                aria-label="Prompt — press Enter to send, Shift+Enter for new line"
                placeholder="พิมพ์ข้อความ… (Enter ส่ง / Shift+Enter ขึ้นบรรทัด)"
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                onKeyDown={onKeyDown}
                disabled={isLoading}
            />
            <div className="composer-toolbar">
                <label className="composer-model-select">
                    <span>Model</span>
                    <select
                        value={selectedModel}
                        onChange={(event) =>
                            onSelectedModelChange(event.target.value)
                        }
                        disabled={isLoading}
                        aria-label="Select AI model"
                    >
                        {availableAiModels.map((model) => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    className={`send-btn${isLoading ? " stop-btn" : ""}`}
                    type={isLoading ? "button" : "submit"}
                    disabled={!isLoading && prompt.trim() === ""}
                    aria-label={isLoading ? "Stop generation" : "Send message"}
                    onClick={isLoading ? onStopGeneration : undefined}
                >
                    {isLoading ? <IconX /> : <IconArrowUp />}
                </button>
            </div>
        </form>
    );
});

type QuickPromptsProps = {
    isLoading: boolean;
    onSendPrompt: (nextPrompt: string) => Promise<void>;
};

export const QuickPrompts = memo(function QuickPrompts({
    isLoading,
    onSendPrompt,
}: QuickPromptsProps) {
    return (
        <div className="quick-prompts">
            {quickPrompts.map((quickPrompt) => (
                <button
                    key={quickPrompt}
                    type="button"
                    onClick={() => void onSendPrompt(quickPrompt)}
                    disabled={isLoading}
                >
                    {quickPrompt}
                </button>
            ))}
        </div>
    );
});
