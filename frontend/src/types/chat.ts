export interface Message {
    type: 'user' | 'assistant';
    content: string;
}