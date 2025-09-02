const prisma = require("../utils/database");

const infoController = {
  // Получить справку
  getHelp: async (req, res) => {
    try {
      // Получаем текст справки из настроек бота или используем стандартный
      const helpSetting = await prisma.bot_settings.findUnique({
        where: { setting_key: "help_message" },
      });

      const helpText =
        helpSetting?.setting_value ||
        `
        <b>Доступные команды:</b>\n\n
        <b>/start</b> - начать работу\n
        <b>/help</b> - помощь\n
        <b>/admin_reg</b> - войти как админ\n
        <b>/exit_admin</b> - выйти из админки\n
        <b>/get_premium</b> - получить премиум подписку\n
        <b>/my_premium</b> - моя премиум подписка
      `;

      res.json({ help: helpText });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = infoController;
