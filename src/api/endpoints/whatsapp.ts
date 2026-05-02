export const whatsappEndpoints = {
  connections: '/api/whatsapp/connections',
  connection: (instanceName: string) => `/api/whatsapp/connections/${instanceName}`,
  connect: (instanceName: string) => `/api/whatsapp/connections/${instanceName}/connect`,
  disconnect: (instanceName: string) => `/api/whatsapp/connections/${instanceName}/disconnect`,
  logout: (instanceName: string) => `/api/whatsapp/connections/${instanceName}/logout`,
  status: '/api/whatsapp/connections/status',
  sendTextMessage: (instanceName: string) => `/api/whatsapp/connections/${instanceName}/messages/text`,
  groups: (instanceName: string) => `/api/whatsapp/connections/${instanceName}/groups`,
  conversations: '/api/whatsapp/conversations',
  conversationMessages: (conversationId: string) => `/api/whatsapp/conversations/${encodeURIComponent(conversationId)}/messages`,
  conversationRead: (conversationId: string) => `/api/whatsapp/conversations/${encodeURIComponent(conversationId)}/read`,
};
