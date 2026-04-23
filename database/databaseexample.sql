create table usuarios (
  id_usuario serial primary key,
  nombre varchar(100) not null,
  apellido varchar(100) not null,
  email varchar(255) not null unique,
  telefono varchar(20),
  creado_en timestamptz default now(),
  actualizado_en timestamptz default now(),
  activo boolean default true
);

create table sesiones (
  id_sesion serial primary key,
  usuario_id int not null references usuarios (id_usuario) on delete cascade,
  token text not null,
  iniciado_en timestamptz default now(),
  expiracion timestamptz not null,
  ip varchar(45),
  user_agent text
);

create table rutas (
  id_ruta serial primary key,
  nombre varchar(200) not null,
  codigo varchar(50) not null unique,
  origen varchar(200) not null,
  destino varchar(200) not null,
  activo boolean default true,
  creado_en timestamptz default now()
);

create table paradas (
  id_parada serial primary key,
  nombre varchar(200) not null,
  latitud decimal(10, 7) not null,
  longitud decimal(10, 7) not null,
  direccion varchar(300),
  activo boolean default true
);

create table ruta_paradas (
  id_ruta_parada serial primary key,
  ruta_id int not null references rutas (id_ruta) on delete cascade,
  parada_id int not null references paradas (id_parada) on delete cascade,
  orden int not null,
  tiempo_estimado_min int not null,
  unique (ruta_id, parada_id)
);

create table vehiculos (
  id_vehiculo serial primary key,
  placa varchar(20) not null unique,
  modelo varchar(100) not null,
  marca varchar(100) not null,
  capacidad int not null,
  activo boolean default true
);

create table choferes (
  id_chofer serial primary key,
  nombre varchar(100) not null,
  apellido varchar(100) not null,
  licencia varchar(50) not null unique,
  fecha_nacimiento date,
  telefono varchar(20),
  activo boolean default true
);

create table chofer_vehiculo (
  id_chofer_vehiculo serial primary key,
  chofer_id int not null references choferes (id_chofer) on delete cascade,
  vehiculo_id int not null references vehiculos (id_vehiculo) on delete cascade,
  asignado_desde timestamptz default now(),
  asignado_hasta timestamptz
);

create table viajes_activos (
  id_viaje serial primary key,
  ruta_id int not null references rutas (id_ruta),
  chofer_id int not null references choferes (id_chofer),
  vehiculo_id int not null references vehiculos (id_vehiculo),
  inicio_programado timestamptz not null,
  inicio_real timestamptz,
  fin_estimada timestamptz,
  estado varchar(50) not null default 'programado'
);

create table ubicaciones_chofer (
  id_ubicacion serial primary key,
  chofer_id int not null references choferes (id_chofer) on delete cascade,
  latitud decimal(10, 7) not null,
  longitud decimal(10, 7) not null,
  registrado_en timestamptz default now(),
  velocidad varchar(20)
);

create table reservaciones (
  id_reservacion serial primary key,
  usuario_id int not null references usuarios (id_usuario),
  ruta_id int not null references rutas (id_ruta),
  viaje_id int references viajes_activos (id_viaje),
  fecha_reserva timestamptz default now(),
  asientos int not null default 1,
  estado varchar(50) not null default 'pendiente',
  total decimal(10, 2) not null
);

create table tickets (
  id_ticket serial primary key,
  reservacion_id int not null references reservaciones (id_reservacion) on delete cascade,
  codigo_ticket varchar(100) not null unique,
  asiento varchar(10),
  estado varchar(50) not null default 'activo',
  emitido_en timestamptz default now()
);


create table metodos_pago (
  id_metodo serial primary key,
  usuario_id int not null references usuarios (id_usuario) on delete cascade,
  tipo varchar(50) not null,
  token_referencia text,
  ultimos4 varchar(4),
  marca varchar(50),
  activo boolean default true,
  creado_en timestamptz default now()
);

create table transacciones (
  id_transaccion serial primary key,
  reservacion_id int not null references reservaciones (id_reservacion),
  metodo_id int not null references metodos_pago (id_metodo),
  monto decimal(10, 2) not null,
  moneda varchar(10) not null default 'MXN',
  estado varchar(50) not null default 'pendiente',
  proveedor_ref varchar(200),
  creado_en timestamptz default now()
);

create table validaciones_qr (
  id_validacion serial primary key,
  ticket_id int not null references tickets (id_ticket),
  usuario_id int not null references usuarios (id_usuario),
  validado_en timestamptz default now(),
  dispositivo varchar(200),
  resultado varchar(50) not null
);

create table notificaciones (
  id_notificacion serial primary key,
  usuario_id int not null references usuarios (id_usuario) on delete cascade,
  canal varchar(50) not null,
  titulo varchar(200) not null,
  mensaje text not null,
  estado varchar(50) not null default 'pendiente',
  enviado_en timestamptz,
  leido_en timestamptz
);



create table calificaciones (
  id_calificacion serial primary key,
  usuario_id int not null references usuarios (id_usuario),
  viaje_id int not null references viajes_activos (id_viaje),
  puntuacion int not null check (puntuacion between 1 and 5),
  comentario text,
  creado_en timestamptz default now()
);