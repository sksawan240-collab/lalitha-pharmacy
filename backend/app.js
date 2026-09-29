io.on('connection', (socket) => {
  const user = socket.user;
  if (!user) return;

  socket.join(`user:${user._id}`);
  socket.join(`role:${user.role.toLowerCase()}`);

  realtime.emitToUser(
    user._id,
    'connected',
    { message: `Welcome, ${user.name}` }
  );

  socket.on('disconnect', () => {
    socket.leave(`user:${user._id}`);
    socket.leave(`role:${user.role.toLowerCase()}`);
  });
});
