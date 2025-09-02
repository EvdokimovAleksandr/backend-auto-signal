const registerUser = async (req, res) => {
  try {
    const { userId, username, fullName } = req.body;

    // Проверяем существование пользователя
    let user = await prisma.users.findUnique({
      where: { user_id: userId },
    });

    // Если пользователя нет - создаем
    if (!user) {
      user = await prisma.users.create({
        data: {
          user_id: userId,
          username: username,
          full_name: fullName,
        },
      });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
