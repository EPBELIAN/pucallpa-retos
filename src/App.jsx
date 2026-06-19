import React, { useEffect, useRef, useState } from "react";
import yapeQr from "./assets/yape-qr.jpg";
import logoPucallpa from "./assets/logo-pucallpa.png";
import { supabase } from "./supabaseClient";
import { motion } from "framer-motion";
import {
  CalendarDays,
  UserPlus,
  Users,
  Gift,
  X,
} from "lucide-react";

export default function App() {
  const [activeSport, setActiveSport] = useState("futbol");
  const [openRoom, setOpenRoom] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [roomTeams, setRoomTeams] = useState({});
  

  const [usuarios, setUsuarios] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
const [usuarioActivo, setUsuarioActivo] = useState(null);
const [cargandoSesion, setCargandoSesion] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [nuevoCelular, setNuevoCelular] = useState("");
  const [premios, setPremios] = useState([]);
  const [nuevoPremio, setNuevoPremio] = useState("");
  const [canjes, setCanjes] = useState([]);
  const [nuevoPuntaje, setNuevoPuntaje] = useState("");
 const [nuevaImagen, setNuevaImagen] = useState(null);
  const [loginCelular, setLoginCelular] = useState("");
  const [showPhoneModal, setShowPhoneModal] = useState(false);
 const [nicknameRegistro, setNicknameRegistro] = useState("");
 const [usuarioPendiente, setUsuarioPendiente] = useState(null);
  const [showRegistrosModal, setShowRegistrosModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  
 const cargarPlayers = async (mostrarCarga = false) => {
  if (mostrarCarga) setLoadingPlayers(true);

  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("puntos", { ascending: false });

    if (error) {
      console.error("Error cargando players:", error.message);
      return;
    }

    setUsuarios(data || []);
  } catch (error) {
    console.error("Error inesperado cargando players:", error);
  } finally {
    setLoadingPlayers(false);
  }
};
  useEffect(() => {
   cargarPlayers();
    cargarPremios();
    cargarCanjes();
  }, []);


const manejarUsuarioGoogle = async (googleUser) => {
  if (!googleUser) {
    setUsuarioActivo(null);
    setCargandoSesion(false);
    return;
  }

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", googleUser.id)
    .maybeSingle();

  if (error) {
  console.error("Error buscando usuario:", error.message);
  setUsuarioActivo(null);
  setCargandoSesion(false);
  return;
}

if (data) {
  setUsuarioActivo(data);

  if (!data.celular || !data.nickname) {
    setShowPhoneModal(true);
  }

  return;
}

    const perfilPendiente = {
    id: googleUser.id,
    nombre: googleUser.user_metadata?.full_name || googleUser.email || "Jugador",
    nickname: "",
    celular: "",
    email: googleUser.email || "",
    password: "google",
    puntos: 0,
    partidas: 0,
    ganadas: 0,
    perdidas: 0,
    role: "user",
  };

  setUsuarioPendiente(perfilPendiente);
  setUsuarioActivo(perfilPendiente);
  setShowPhoneModal(true);
  };

  useEffect(() => {
  const init = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        await manejarUsuarioGoogle(session.user);
      } else {
        setUsuarioActivo(null);
      }
    } catch (error) {
      console.error("Error iniciando sesión:", error);
      setUsuarioActivo(null);
    } finally {
      setCargandoSesion(false);
    }
  };

  init();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      setUsuarioActivo(null);
      setShowUserMenu(false);
      setCargandoSesion(false);
      return;
    }

    if (session?.user) {
      await manejarUsuarioGoogle(session.user);
      setCargandoSesion(false);
    }
  });

  return () => subscription.unsubscribe();
}, []);

  useEffect(() => {
  const cargarRooms = async () => {
    const { data, error } = await supabase.from("rooms").select("*");

    if (error) {
      console.error("Error cargando rooms:", error);
      return;
    }

    const roomsObject = {};

    data.forEach((room) => {
      roomsObject[room.slot_id] = {
        green: room.green || [],
        red: room.red || [],
        confirmed: room.confirmed || [],
      };
    });

    setRoomTeams(roomsObject);
  };

  cargarRooms();

  const channel = supabase
    .channel("rooms-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rooms",
      },
      () => {
        cargarRooms();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
useEffect(() => {
  const channel = supabase
    .channel("players-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players" },
      (payload) => {
        cargarPlayers(false);

        if (payload.new?.id) {
          setUsuarioActivo((prev) =>
            prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev
          );
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);

const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: "select_account",
      },
    },
  });
  if (error) {
    alert("No se pudo iniciar sesión con Google. Revisa la configuración en Supabase.");
  }
};

const cerrarSesion = async () => {
  setShowUserMenu(false);

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("Error cerrando sesión:", error);
  }

  setUsuarioActivo(null);
  setUsuarioPendiente(null);
  setShowPhoneModal(false);
  setShowRegistrosModal(false);

};
  const updatePlayerStats = async (id, resultado) => {
    if (!isAdminUser()) {
      alert("Solo el administrador principal puede modificar victorias y derrotas.");
      return;
    }

    const user = usuarios.find((u) => u.id === id);
    if (!user) return;

    const newGanadas = resultado === "win" ? (user.ganadas || 0) + 1 : (user.ganadas || 0);
    const newPerdidas = resultado === "lose" ? (user.perdidas || 0) + 1 : (user.perdidas || 0);
    const newPartidas = (user.partidas || 0) + 1;
    const puntos = (user.puntos || 0) + (resultado === "win" ? 20 : 10);

    const { error } = await supabase
      .from("players")
      .update({ partidas: newPartidas, ganadas: newGanadas, perdidas: newPerdidas, puntos })
      .eq("id", id);

    if (error) { alert("Error: " + error.message); return; }

    setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, partidas: newPartidas, ganadas: newGanadas, perdidas: newPerdidas, puntos } : u));
    if (usuarioActivo?.id === id) {
      setUsuarioActivo((prev) => ({ ...prev, partidas: newPartidas, ganadas: newGanadas, perdidas: newPerdidas, puntos }));
    }
  };
const updatePlayerPoints = async (id, nuevosPuntos) => {
  if (!isAdminUser()) {
    alert("Solo el administrador puede editar puntos.");
    return;
  }

  const puntosConvertidos = Number(nuevosPuntos);

  if (Number.isNaN(puntosConvertidos) || puntosConvertidos < 0) {
    alert("Ingresa un puntaje válido.");
    return;
  }

const { error } = await supabase
    .from("players")
    .update({ puntos: puntosConvertidos })
    .eq("id", id);

  if (error) {
    alert("Error guardando puntos: " + error.message);
    return;
  }

  setUsuarios((prev) =>
    prev.map((u) => u.id === id ? { ...u, puntos: puntosConvertidos } : u)
  );
  if (usuarioActivo?.id === id) {
    setUsuarioActivo((prev) => ({ ...prev, puntos: puntosConvertidos }));
  }
};
  const deletePlayer = async (id) => {
  if (!isAdminUser()) {
    alert("Solo el administrador principal puede eliminar usuarios.");
    return;
  }

  const confirmar = confirm(
    "¿Seguro que deseas eliminar este usuario por completo?"
  );

  if (!confirmar) return;

  const { error: claimsError } = await supabase
    .from("reward_claims")
    .delete()
    .eq("user_id", id);

  if (claimsError) {
    console.error(claimsError);
  }

  const { error: playerError } = await supabase
    .from("players")
    .delete()
    .eq("id", id);

  if (playerError) {
    alert(playerError.message);
    return;
  }

  setUsuarios((prev) => prev.filter((u) => u.id !== id));

  if (usuarioActivo?.id === id) {
    cerrarSesion();
  }

  alert("Usuario eliminado correctamente.");
};
  const [slots] = useState([
    { id: 1, sport: "futbol", time: "2:00 pm", status: "available" },
    { id: 2, sport: "futbol", time: "3:00 pm", status: "available" },
    { id: 3, sport: "futbol", time: "4:00 pm", status: "available" },
    { id: 4, sport: "futbol", time: "5:00 pm", status: "available" },
    { id: 5, sport: "futbol", time: "6:00 pm", status: "available" },
    { id: 6, sport: "futbol", time: "7:00 pm", status: "available" },
    { id: 7, sport: "futbol", time: "8:00 pm", status: "available" },
    { id: 8, sport: "futbol", time: "9:00 pm", status: "available" },
    { id: 9, sport: "futbol", time: "10:00 pm", status: "available" },
    { id: 10, sport: "futbol", time: "11:00 pm", status: "available" },
    { id: 11, sport: "futbol", time: "12:00 am", status: "available" },
    { id: 12, sport: "futbol", time: "1:00 am", status: "available" },
    { id: 13, sport: "futbol", time: "2:00 am", status: "available" },
    { id: 14, sport: "voley", time: "2:00 pm", status: "available" },
    { id: 15, sport: "voley", time: "3:00 pm", status: "available" },
    { id: 16, sport: "voley", time: "4:00 pm", status: "available" },
    { id: 17, sport: "voley", time: "5:00 pm", status: "available" },
    { id: 18, sport: "voley", time: "6:00 pm", status: "available" },
    { id: 19, sport: "voley", time: "7:00 pm", status: "available" },
    { id: 20, sport: "voley", time: "8:00 pm", status: "available" },
    { id: 21, sport: "voley", time: "9:00 pm", status: "available" },
    { id: 22, sport: "voley", time: "10:00 pm", status: "available" },
    { id: 23, sport: "voley", time: "11:00 pm", status: "available" },
    { id: 24, sport: "voley", time: "12:00 am", status: "available" },
    { id: 25, sport: "voley", time: "1:00 am", status: "available" },
    { id: 26, sport: "voley", time: "2:00 am", status: "available" },
  ]);

  const filteredSlots = slots.filter((slot) => slot.sport === activeSport);
  const openMatchRoom = (slot) => {
    const totalPlayers = getSlotTotal(slot);
    const maxPlayers = getMaxPlayersBySport(slot.sport);

    if (slot.status === "reserved" || totalPlayers >= maxPlayers) {
      alert("Esta sala ya está llena. Elige otro horario disponible.");
      return;
    }

    setSelectedMatch(slot);
    setOpenRoom(true);
  };

  const getMaxPlayersBySport = (sport) => {
    return sport === "futbol" ? 12 : 10;
  };

  const getMaxPerTeamBySport = (sport) => {
    return sport === "futbol" ? 6 : 5;
  };

  const getMaxPlayers = () => {
    if (!selectedMatch) return 0;
    return getMaxPlayersBySport(selectedMatch.sport);
  };

  const getMaxPerTeam = () => {
    if (!selectedMatch) return 0;
    return getMaxPerTeamBySport(selectedMatch.sport);
  };

  const getTeamsForSlot = (slotId) => {
    const teams = roomTeams[slotId] || { green: [], red: [], confirmed: [] };

    return {
      green: teams.green || [],
      red: teams.red || [],
      confirmed: teams.confirmed || [],
    };
  };

  const getSelectedTeams = () => {
    if (!selectedMatch) return { green: [], red: [] };
    return getTeamsForSlot(selectedMatch.id);
  };

  const getSlotTotal = (slot) => {
    const teams = getTeamsForSlot(slot.id);
    return teams.green.length + teams.red.length;
  };

  const getCurrentPlayerName = () => {
    if (!usuarioActivo) return "";
    return usuarioActivo.nickname || usuarioActivo.nombre;
  };

  useEffect(() => {
  const cerrarMenuFuera = (event) => {
    if (
      showUserMenu &&
      userMenuRef.current &&
      !userMenuRef.current.contains(event.target)
    ) {
      setShowUserMenu(false);
    }
  };

  document.addEventListener("mousedown", cerrarMenuFuera);

  return () => {
    document.removeEventListener("mousedown", cerrarMenuFuera);
  };
}, [showUserMenu]);

  const isAdminUser = () => {
  return usuarioActivo?.role === "admin";
};

  const isCurrentUserInSelectedRoom = () => {
    if (!selectedMatch || !usuarioActivo) return false;

    const name = getCurrentPlayerName();
    const teams = getSelectedTeams();

    return teams.green.includes(name) || teams.red.includes(name);
  };

  const joinTeam = async (team) => {
  if (!selectedMatch) return;

  if (!usuarioActivo) {
  alert("Primero inicia sesión.");
  return;
}

if (!usuarioActivo?.celular || !usuarioActivo?.nickname) {
  alert("Debes registrar tu WhatsApp y nickname antes de elegir equipo.");
  return;
}


const name = getCurrentPlayerName();

  const maxPerTeam = getMaxPerTeam();
  const currentTeams = getTeamsForSlot(selectedMatch.id);
  const totalPlayers =
    currentTeams.green.length + currentTeams.red.length;

  if (totalPlayers >= getMaxPlayers()) {
    alert("Sala llena");
    return;
  }

  if (
    currentTeams.green.includes(name) ||
    currentTeams.red.includes(name)
  ) {
    alert("Ya estás inscrito");
    return;
  }

  if (
    team === "green" &&
    currentTeams.green.length >= maxPerTeam
  ) {
    alert("Equipo Verde lleno");
    return;
  }

  if (
    team === "red" &&
    currentTeams.red.length >= maxPerTeam
  ) {
    alert("Equipo Rojo lleno");
    return;
  }

  const updatedRoom = {
    green:
      team === "green"
        ? [...currentTeams.green, name]
        : currentTeams.green,
    red:
      team === "red"
        ? [...currentTeams.red, name]
        : currentTeams.red,
    confirmed: currentTeams.confirmed || [],
  };

  await supabase.from("rooms").upsert(
  [
    {
      slot_id: selectedMatch.id,
      green: updatedRoom.green,
      red: updatedRoom.red,
      confirmed: updatedRoom.confirmed,
    },
  ],
  { onConflict: "slot_id" }
);
};
const leaveCurrentRoom = async () => {
  if (!selectedMatch || !usuarioActivo) return;

  const name = getCurrentPlayerName();
  const currentTeams = getSelectedTeams();

  const updatedRoom = {
    green: currentTeams.green.filter((p) => p !== name),
    red: currentTeams.red.filter((p) => p !== name),
    confirmed: currentTeams.confirmed.filter((p) => p !== name),
  };

  await supabase.from("rooms").upsert(
    [
      {
        slot_id: selectedMatch.id,
        green: updatedRoom.green,
        red: updatedRoom.red,
        confirmed: updatedRoom.confirmed,
      },
    ],
    { onConflict: "slot_id" }
  );
};

const confirmParticipation = async () => {
  if (!selectedMatch || !usuarioActivo) return;

  const name = getCurrentPlayerName();
  const currentTeams = getSelectedTeams();

  if (
    !currentTeams.green.includes(name) &&
    !currentTeams.red.includes(name)
  ) {
    alert("Primero elige equipo");
    return;
  }

  if (currentTeams.confirmed.includes(name)) {
    setShowPaymentModal(true);
    return;
  }

  await supabase.from("rooms").upsert(
    [
      {
        slot_id: selectedMatch.id,
        green: currentTeams.green,
        red: currentTeams.red,
        confirmed: [...currentTeams.confirmed, name],
      },
    ],
    { onConflict: "slot_id" }
  );

  setShowPaymentModal(true);
};
const editarPremio = (id, campo, valor) => {
  if (!isAdminUser()) return;

  setPremios((prev) =>
    prev.map((premio) =>
      premio.id === id
        ? {
            ...premio,
            [campo]: campo === "puntos" ? Number(valor) : valor,
          }
        : premio
    )
  );
};
const cargarPremios = async () => {
  const { data, error } = await supabase
    .from("rewards")
    .select("*")
    .eq("activo", true)
    .order("id");

  if (!error && data) {
    setPremios(data);
  }
};
const cargarCanjes = async () => {
  const { data } = await supabase
    .from("reward_claims")
    .select("*, rewards(nombre)")
    .order("id", { ascending: false });
  if (data) setCanjes(data);
};

const aprobarCanje = async (id) => {
  await supabase.from("reward_claims").update({ estado: "entregado" }).eq("id", id);
  cargarCanjes();
};

const rechazarCanje = async (id, userId, puntos) => {
  // Devolver puntos al usuario
  const { data: perfil } = await supabase.from("players").select("puntos").eq("id", userId).single();
  const puntosActuales = perfil?.puntos || 0;
  await supabase.from("players").update({ puntos: puntosActuales + puntos }).eq("id", userId);
  await supabase.from("reward_claims").update({ estado: "rechazado" }).eq("id", id);
  cargarCanjes();
};
const subirPremio = async () => {
  if (!nuevoPremio || !nuevoPuntaje || !nuevaImagen) {
    alert("Completa premio, puntos e imagen");
    return;
  }

  const fileName = `${Date.now()}-${nuevaImagen.name}`;

  const { error: uploadError } = await supabase.storage
    .from("reward-images")
    .upload(fileName, nuevaImagen);

  if (uploadError) {
    alert("Error subiendo imagen");
    return;
  }

  const { data } = supabase.storage
    .from("reward-images")
    .getPublicUrl(fileName);

  const imageUrl = data.publicUrl;

  const { error } = await supabase
    .from("rewards")
    .insert({
      nombre: nuevoPremio,
      puntos: Number(nuevoPuntaje),
      imagen_url: imageUrl,
    });

  if (error) {
    alert("Error guardando premio");
    return;
  }

  alert("Premio agregado");

  setNuevoPremio("");
  setNuevoPuntaje("");
  setNuevaImagen(null);

  cargarPremios();
};
const guardarCambiosPremio = async (premio) => {
  if (!isAdminUser()) return;

  const { error } = await supabase
    .from("rewards")
    .update({
      nombre: premio.nombre,
      puntos: Number(premio.puntos),
      imagen_url: premio.imagen_url,
    })
    .eq("id", premio.id);

  if (error) {
    alert("Error guardando cambios del premio");
    return;
  }

  alert("Premio actualizado");
  cargarPremios();
};

const eliminarPremio = async (id) => {
  if (!isAdminUser()) return;

  const confirmar = confirm("¿Seguro que deseas eliminar este premio?");
  if (!confirmar) return;

  const { error } = await supabase
    .from("rewards")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Error eliminando premio");
    return;
  }

  alert("Premio eliminado");
  cargarPremios();
};

const reclamarPremio = async (premio) => {
  if (!usuarioActivo) {
    alert("Debes iniciar sesión para reclamar.");
    return;
  }

  const { data: perfil } = await supabase
    .from("players")
    .select("puntos")
    .eq("id", usuarioActivo.id)
    .single();

  const puntosActuales = perfil?.puntos || 0;
  const puntosRequeridos = Math.max(Number(premio.puntos || 0), 500);

  if (puntosActuales < puntosRequeridos) {
    alert(`No tienes puntos suficientes. Tienes ${puntosActuales} y necesitas ${puntosRequeridos}.`);
    return;
  }

  const nuevosPuntos = puntosActuales - puntosRequeridos;

  const { error: puntosError } = await supabase
    .from("players")
    .update({ puntos: nuevosPuntos })
    .eq("id", usuarioActivo.id);

  if (puntosError) { alert("Error descontando puntos."); return; }

  const { error: claimError } = await supabase.from("reward_claims").insert({
    reward_id: premio.id,
    user_id: usuarioActivo.id,
    user_name: usuarioActivo.nombre,
    celular: usuarioActivo.celular || "",
    puntos_usados: puntosRequeridos,
    estado: "pendiente",
  });

  if (claimError) { alert("Error registrando canje: " + claimError.message); return; }

  setUsuarioActivo((prev) => ({ ...prev, puntos: nuevosPuntos }));
  setUsuarios((prev) =>
    prev.map((u) => u.id === usuarioActivo.id ? { ...u, puntos: nuevosPuntos } : u)
  );

  alert("✅ Canje solicitado. El administrador validará y enviará tu premio.");
};

const guardarCelular = async () => {
  const celularLimpio = nuevoCelular.trim();
  const nicknameLimpio = nicknameRegistro.trim();

  if (!celularLimpio || celularLimpio.length < 9) {
    alert("Ingresa un WhatsApp válido (mínimo 9 dígitos).");
    return;
  }

  if (!nicknameLimpio || nicknameLimpio.length < 3) {
    alert("Ingresa un nickname válido (mínimo 3 letras).");
    return;
  }

  const { error } = await supabase
    .from("players")
    .update({
      celular: celularLimpio,
      nickname: nicknameLimpio,
    })
    .eq("id", usuarioActivo.id);

  if (error) {
    alert("Error guardando datos: " + error.message);
    return;
  }

  setUsuarioActivo((prev) => ({
    ...prev,
    celular: celularLimpio,
    nickname: nicknameLimpio,
  }));

  setNuevoCelular("");
  setNicknameRegistro("");
  alert("WhatsApp y nickname registrados correctamente.");
};

return (
    <div style={styles.page}>
      <div style={styles.pattern}>
      <nav style={styles.navbar}>
  <div style={styles.logo}>
    <img
      src={logoPucallpa}
      alt="Pucallpa Retos"
      style={styles.logoImage}
    />
  </div>


   <div style={styles.navLinks}>
  <a style={styles.navLink} href="#retos">Retos</a>
  <a style={styles.navLink} href="#premios">Premios</a>
  {isAdminUser() && (
  <button
    style={styles.navAuthBtn}
    onClick={() => setShowRegistrosModal(true)}
  >
    Registros
  </button>
)}
  {cargandoSesion ? (
  <button style={{ ...styles.navAuthBtn, opacity: 0.7 }} disabled>
    Cargando...
  </button>
) : !usuarioActivo ? (
  <button
    style={styles.navAuthBtn}
    onClick={() => setShowLoginModal(true)}
  >
    Entrar
  </button>
) : (
    <div
  style={styles.googleUserChip}
  onClick={() => setShowUserMenu(!showUserMenu)}
>
  <div style={styles.googleAvatar}>
    {(usuarioActivo.nickname || usuarioActivo.nombre || "P")[0]
      ?.toUpperCase()}
  </div>

  <span style={styles.googleUserName}>
    {usuarioActivo.nickname || usuarioActivo.nombre} · {usuarioActivo.puntos || 0} pts
  </span>
</div>
  )}
</div>
        </nav>

        <main style={styles.container}>
          <motion.section
            style={styles.hero}
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span style={styles.badge}>Arena deportiva digital de Pucallpa</span>

            <h1 style={styles.title}>
              Pucallpa Retos: fútbol y vóley competitivo
            </h1>

          {usuarioActivo && (
  <div
  style={styles.sessionBanner}
  onClick={() => setShowUserMenu(!showUserMenu)}
>
  <span>
    👤 {usuarioActivo?.nombre || "Usuario"}
  </span>

  <span>
    ⭐ {usuarioActivo?.puntos || 0} puntos 
  </span>
</div>
)}
{showUserMenu && usuarioActivo && (
  <>
    <div
      style={styles.profileBackdrop}
      onClick={() => setShowUserMenu(false)}
    />

    <div style={styles.profileDropdown}>
      <div style={styles.profileCardTop}>
        <div style={styles.profileAvatarLarge}>
          {(usuarioActivo.nickname || usuarioActivo.nombre || "P")[0]?.toUpperCase()}
        </div>

        <strong style={styles.profileName}>
          {usuarioActivo.nombre || "Usuario"}
        </strong>

        <span style={styles.profileEmail}>
          {usuarioActivo.email || ""}
        </span>
      </div>

      <div style={styles.profileStatsGrid}>
        <div style={styles.profileStatCard}>
          <span style={styles.profileStatLabel}>Teléfono</span>
          <strong style={styles.profileStatValue}>
            {usuarioActivo.celular || "No registrado"}
          </strong>
        </div>

        <div style={styles.profileStatCard}>
          <span style={styles.profileStatLabel}>Puntos</span>
          <strong style={styles.profileStatValue}>
            {(usuarioActivo.puntos || 0).toLocaleString()}
          </strong>
        </div>

        <div style={styles.profileStatCard}>
          <span style={styles.profileStatLabel}>Victorias</span>
          <strong style={styles.profileStatValue}>
            {usuarioActivo.ganadas || 0}
          </strong>
        </div>

        <div style={styles.profileStatCard}>
          <span style={styles.profileStatLabel}>Derrotas</span>
          <strong style={styles.profileStatValue}>
            {usuarioActivo.perdidas || 0}
          </strong>
        </div>
      </div>

      <button style={styles.profileLogout} onClick={cerrarSesion}>
        Cerrar sesión
      </button>
    </div>
  </>
)}

           <div style={styles.heroButtons}>
  <a style={styles.primaryBtn} href="#retos">
    Reservar slot
  </a>

  {isAdminUser() && (
   <a style={styles.adminBtn} href="#players">
  👥 Participantes
</a>
  )}
  <button
  style={styles.rulesHeroBtn}
  onClick={() => setShowRulesModal(true)}
>
  Reglas
</button>
</div>
          </motion.section>

          <section id="retos" style={styles.gridPrincipal}>
            <motion.div style={styles.cardGrande} whileHover={{ y: -6 }}>
              <div style={styles.cardHeader}>
                <div>
                 <h2 style={styles.sectionTitle}>⚽ Salas Disponibles</h2>
                  <p style={styles.muted}>
                    Haz clic en un horario disponible para abrir la sala y elegir equipo.
                  </p>
                </div>
                <CalendarDays color="#39ff66" size={32} />
              </div>

              <div style={styles.sportTabs}>
                <button
                  style={activeSport === "futbol" ? styles.activeTab : styles.tab}
                  onClick={() => setActiveSport("futbol")}
                >
                  ⚽ Fútbol 7
                </button>

                <button
                  style={activeSport === "voley" ? styles.activeTab : styles.tab}
                  onClick={() => setActiveSport("voley")}
                >
                  🏐 Vóley mixto
                </button>
              </div>

              <div style={styles.slotGrid}>
                {filteredSlots.map((slot) => {
                  const totalPlayers = getSlotTotal(slot);
                  const maxPlayers = getMaxPlayersBySport(slot.sport);
                  const progress = Math.min((totalPlayers / maxPlayers) * 100, 100);
                  const isFull = totalPlayers >= maxPlayers || slot.status === "reserved";

                  return (
                    <motion.div
                      key={slot.id}
                      whileHover={!isFull ? { scale: 1.03, y: -4 } : {}}
                      style={{
                        ...styles.slot,
                        ...(isFull && styles.reserved),
                      }}
                      onClick={() => openMatchRoom(slot)}
                    >
                      <div style={styles.slotTop}>
                        <strong>{slot.time}</strong>
                        <span style={isFull ? styles.statusReserved : styles.statusAvailable}>
                          {isFull ? "Lleno" : "Disponible"}
                        </span>
                      </div>

                      <div style={styles.slotCapacityBox}>
                        <div style={styles.slotCapacityText}>
                          <Users size={16} />
                          <strong>{totalPlayers}/{maxPlayers}</strong>
                          <span>{slot.sport === "futbol" ? "" : ""}</span>
                        </div>

                        <div style={styles.slotMiniProgress}>
                          <span style={{ width: `${progress}%`, height: "100%", display: "block", background: "linear-gradient(90deg, #39ff66, #f97316)" }} />
                        </div>
                      </div>

                      <div style={styles.slotBottom}>
                        <Users size={15} />
                        <span>{isFull ? "Sala llena" : "Abrir sala"}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div style={styles.rewardsCard} whileHover={{ y: -6 }} id="premios">
  <div style={styles.cardHeader}>
  <div>
    <h2 style={styles.sectionTitle}>Premios Canjeables</h2>
    <p style={styles.muted}>
      canjea los puntos acumulados.
    </p>
  </div>

  <div style={styles.rulesMiniBox}>

    <CalendarDays color="#39ff66" size={32} />
  </div>
</div>
  {isAdminUser() && (
  <div style={styles.adminRewardsBox}>
    <h3>Administrador premios</h3>

    <input
      style={styles.rewardInput}
      placeholder="Nombre premio"
      value={nuevoPremio}
      onChange={(e) => setNuevoPremio(e.target.value)}
    />

    <input
      style={styles.rewardInput}
      placeholder="Puntos"
      value={nuevoPuntaje}
      onChange={(e) => setNuevoPuntaje(e.target.value)}
    />

    <input
      type="file"
      onChange={(e) => setNuevaImagen(e.target.files[0])}
    />

    <button
      style={styles.claimBtn}
      onClick={subirPremio}
    >
      Guardar premio
    </button>
  </div>
)}
{isAdminUser() && (
  <div style={{ ...styles.adminRewardsBox, marginTop: "20px" }}>
    <h3 style={{ color: "#39ff66", marginBottom: "12px" }}>
      📋 Canjes pendientes ({canjes.filter(c => c.estado === "pendiente").length})
    </h3>
    {canjes.filter(c => c.estado === "pendiente").length === 0 ? (
      <p style={{ color: "#d1fae5" }}>No hay canjes pendientes.</p>
    ) : (
      canjes.filter(c => c.estado === "pendiente").map((canje) => (
        <div key={canje.id} style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: "12px",
          padding: "12px",
          marginBottom: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px"
        }}>
          <div>
            <div style={{ color: "#fff", fontWeight: "800" }}>{canje.user_name}</div>
            <div style={{ color: "#39ff66", fontSize: "13px" }}>{canje.rewards?.nombre} — {canje.puntos_usados} pts</div>
            <div style={{ color: "#aaa", fontSize: "12px" }}>Cel: {canje.celular || "No registrado"}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => aprobarCanje(canje.id)} style={{
              background: "#22c55e", color: "#fff", border: "none",
              borderRadius: "8px", padding: "6px 14px", fontWeight: "800", cursor: "pointer"
            }}>✅ Entregar</button>
            <button onClick={() => rechazarCanje(canje.id, canje.user_id, canje.puntos_usados)} style={{
              background: "#ef4444", color: "#fff", border: "none",
              borderRadius: "8px", padding: "6px 14px", fontWeight: "800", cursor: "pointer"
            }}>❌ Rechazar</button>
          </div>
        </div>
      ))
    )}
  </div>
)}
  <div style={styles.rewardsGrid}>
  {premios.length === 0 ? (
    <div style={styles.emptyRewards}>
      🎁 Próximamente premios disponibles.
    </div>
  ) : (
    premios.map((premio) => (
      <div key={premio.id} style={styles.rewardItem}>
        <img
          src={premio.imagen_url}
          alt={premio.nombre}
          style={styles.rewardImage}
        />

        <div style={styles.rewardInfo}>
          <strong>{premio.nombre}</strong>
          <span>{premio.puntos} puntos</span>
        </div>
 <button
  style={styles.claimBtn}
  disabled={
    !usuarioActivo ||
    (usuarioActivo.puntos || 0) < Math.max(Number(premio.puntos || 0), 500)
  }
  onClick={() => reclamarPremio(premio)}
>
  {!usuarioActivo
    ? "Inicia sesión"
    : (usuarioActivo.puntos || 0) < Math.max(Number(premio.puntos || 0), 500)
    ? "Puntos insuficientes"
    : "Reclamar"}
</button>

        {isAdminUser() && (
          <div style={styles.rewardAdminBox}>
            <input
              style={styles.rewardInput}
              value={premio.nombre}
              onChange={(e) =>
                editarPremio(premio.id, "nombre", e.target.value)
              }
              placeholder="Nombre del premio"
            />
            <button
  style={styles.claimBtn}
  onClick={() => guardarCambiosPremio(premio)}
>
  Guardar cambios
</button>

<button
  style={styles.rewardDeleteBtn}
  onClick={() => eliminarPremio(premio.id)}
>
  Eliminar premio
</button>
          

            <input
              style={styles.rewardInput}
              value={premio.puntos}
              onChange={(e) =>
                editarPremio(premio.id, "puntos", e.target.value)
              }
              placeholder="Puntos"
            />

            <input
              style={styles.rewardInput}
              value={premio.imagen_url || ""}
              onChange={(e) =>
                editarPremio(premio.id, "imagen_url", e.target.value)
              }
              placeholder="URL imagen"
            />
          </div>
        )}
      </div>
    ))
    )}
  </div>
</motion.div>         
 </section>


 {isAdminUser() && (
  <section id="players" style={styles.playersSection}>          
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.playersTitle}>Players registrados</h2>
                <p style={styles.playersText}>
                  Aquí podras ver los puntajes de todos los deportistas. 
                </p>
              </div>
              <Users color="#39ff66" size={34} />
            </div>

            

          <div style={styles.adminPanelNotice}>
  👑 Modo administrador activo: puedes eliminar usuarios y registrar victorias o derrotas.
</div>

       {loadingPlayers ? (
  <p style={styles.playersText}>
    Cargando jugadores...
  </p>
) : usuarios.length === 0 ? (
  <p style={styles.playersText}>
    Aún no hay jugadores registrados.
  </p>
) : (
              <div style={styles.playersGrid}>
              {usuarios.map((user) => {                 const partidas = user.partidas || 0;
                  const ganadas = user.ganadas || 0;
                  const perdidas = user.perdidas || 0;
                  const rendimiento = partidas > 0 ? Math.round((ganadas / partidas) * 100) : 0;
                  const avance = Math.min((partidas / 10) * 100, 100);

                  return (
                    <div key={user.id} style={styles.playerCard}>
                      <div style={styles.playerHeader}>
                        <div>
                          <h3>{user.nickname || user.nombre}</h3>

                          {isAdminUser() && (
  <>
    <p style={styles.privateInfo}>
      Nombre real: {user.nombre || "Sin nombre"}
    </p>

    <p style={styles.privateInfo}>
      Celular: {user.celular || "No registrado"}
    </p>

    <p>
      {user.deporte} · {user.nivel}
    </p>
  </>
)}
                        </div>
                                   </div>

                      <div style={{ textAlign:"center", padding:"18px 0 10px", borderBottom:"1px solid rgba(57,255,102,0.15)" }}>
  <div style={{ fontSize:"42px", fontWeight:"950", color:"#064e3b", lineHeight:1 }}>
    {user.puntos || 0}
  </div>
  <div style={{ color:"#14532d", fontWeight:"800", fontSize:"13px", marginTop:"4px" }}>
    PUNTOS ACUMULADOS
  </div>
</div>

<div style={{ padding:"12px 0 4px" }}>
  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
    <span style={{ color:"#14532d", fontSize:"12px", fontWeight:"800" }}>
      {(user.puntos || 0) < 500 ? `Faltan ${500 - (user.puntos || 0)} pts para canjear` : "🎁 Puede canjear premios"}
    </span>
    <span style={{ color:"#065f46", fontSize:"12px", fontWeight:"900" }}>
      {Math.min(Math.round(((user.puntos || 0) / 500) * 100), 100)}%
    </span>
  </div>
  <div style={{ height:"8px", borderRadius:"99px", background:"#bbf7d0" }}>
    <div style={{
      height:"100%", borderRadius:"99px",
      width:`${Math.min(((user.puntos || 0) / 500) * 100, 100)}%`,
      background:"linear-gradient(90deg, #39ff66, #22c55e)",
      transition:"width 0.6s ease"
    }} />
  </div>
</div>

<div style={styles.playerStats}>
  <div><strong>{partidas}</strong><span>Partidas</span></div>
  <div><strong>{ganadas}</strong><span>Ganadas</span></div>
  <div><strong>{perdidas}</strong><span>Perdidas</span></div>
  <div><strong>{rendimiento}%</strong><span>Winrate</span></div>
</div>

                      <div style={styles.progressBar}>
                        <span
                          style={{
                            width: `${avance}%`,
                            height: "100%",
                            display: "block",
                           backgroundImage:
  "repeating-linear-gradient(135deg, rgba(6,78,59,0.08) 0px, rgba(6,78,59,0.08) 2px, transparent 2px, transparent 18px)",
                          }}
                        />
                      </div>

                      {isAdminUser() ? (
                        <>
                        <div style={styles.pointsAdminBox}>
  <label style={styles.pointsLabel}>Editar puntos</label>

  <input
    type="number"
    style={styles.pointsInput}
    defaultValue={user.puntos || 0}
    onBlur={(e) => updatePlayerPoints(user.id, e.target.value)}
  />
</div>
                          <div style={styles.playerActions}>
                            <button style={styles.winBtn} onClick={() => updatePlayerStats(user.id, "win")}>
                              + Victoria
                            </button>
                            <button style={styles.loseBtn} onClick={() => updatePlayerStats(user.id, "lose")}>
                              + Derrota
                            </button>
                          </div>

                          <button style={styles.deleteBtn} onClick={() => deletePlayer(user.id)}>
                            Eliminar player
                          </button>
                        </>
                      ) : (
                        <div style={styles.onlyAdminBox}>
                          🔒 Solo el administrador puede editar este player.
                        </div>
                      )}

                      </div>
                  );
                })}
              </div>
            )}
                   </section>
)}

        </main>
      </div>

      {openRoom && selectedMatch && (
        <div style={styles.modalOverlay}>
          <motion.div
            style={styles.roomModal}
            initial={{ scale: 0.92, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
          >
            <button style={styles.closeRoom} onClick={() => setOpenRoom(false)}>
              <X size={20} />
            </button>

  

              <div style={styles.roomInfo}>
  <div>
    <strong style={styles.roomInfoTitle}>
      {selectedMatch.sport === "futbol" ? "⚽ Fútbol" : "🏐 Vóley"} · {selectedMatch.time}
    </strong>

    <p style={styles.roomInfoText}>
      Elige un equipo y asegura tu cupo.
    </p>
  </div>

  <div style={styles.roomInfoCounter}>
    <strong>
      {getSelectedTeams().green.length + getSelectedTeams().red.length}/{getMaxPlayers()}
    </strong>
    <span>jugadores</span>
  </div>
</div>         

            {!usuarioActivo?.celular && (
              <div style={styles.roomPhoneBox}>
                <strong>📱 Registra tu WhatsApp para elegir equipo</strong>

                <p>
                  Debes guardar tu número antes de seleccionar Equipo Verde o Equipo Rojo.
                </p>

                <div style={styles.roomPhoneForm}>
                  <input
                    type="tel"
                    placeholder="Ejemplo: 900123456"
                    value={nuevoCelular}
                    onChange={(e) => setNuevoCelular(e.target.value)}
                    style={styles.phoneInput}
                  />
                  <input
  type="text"
  placeholder="Nickname obligatorio"
  value={nicknameRegistro}
  onChange={(e) => setNicknameRegistro(e.target.value)}
  style={styles.phoneInput}
/>

                  <button
                    style={styles.phoneBtn}
                    onClick={guardarCelular}
                  >
                    Guardar WhatsApp
                  </button>
                </div>
              </div>
            )}
           

            <div style={styles.teamsRoom}>
              <div style={styles.teamGreen}>
                <div style={styles.teamHeader}>
                  <div>
                    <h3>🟢 Equipo Verde</h3>
                    <p>{getSelectedTeams().green.length}/{getMaxPerTeam()} jugadores</p>
                  </div>
                  <strong>{getSelectedTeams().green.length >= getMaxPerTeam() ? "FULL" : "OPEN"}</strong>
                </div>

                <div style={styles.teamProgress}>
                  <span style={{ width: `${Math.min((getSelectedTeams().green.length / getMaxPerTeam()) * 100, 100)}%`, height: "100%", display: "block", background: "linear-gradient(90deg, #39ff66, #16a34a)" }} />
                </div>

                <button
                  style={{
                    ...styles.joinGreen,
                    opacity: getSelectedTeams().green.length >= getMaxPerTeam() ? 0.5 : 1,
                    cursor: getSelectedTeams().green.length >= getMaxPerTeam() ? "not-allowed" : "pointer",
                  }}
                  disabled={getSelectedTeams().green.length >= getMaxPerTeam()}
                  onClick={() => joinTeam("green")}
                >
                 {getSelectedTeams().green.length >= getMaxPerTeam() ? "Equipo Verde lleno" : "Unirme al Equipo Verde"}
                </button>

                <div style={styles.playersList}>
                  {getSelectedTeams().green.length === 0 ? (
                    <div style={styles.emptyTeam}>Esperando jugadores...</div>
                  ) : (
                    getSelectedTeams().green.map((player, index) => (
                      <div key={index} style={styles.playerItem}>
                        👤 {player}
                        <span>
                          {getSelectedTeams().confirmed.includes(player) ? "CONFIRMADO" : "LISTO"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={styles.teamRed}>
                <div style={styles.teamHeader}>
                  <div>
                    <h3>🔴 Equipo Rojo</h3>
                    <p>{getSelectedTeams().red.length}/{getMaxPerTeam()} jugadores</p>
                  </div>
                  <strong>{getSelectedTeams().red.length >= getMaxPerTeam() ? "FULL" : "OPEN"}</strong>
                </div>

                <div style={styles.teamProgress}>
                  <span style={{ width: `${Math.min((getSelectedTeams().red.length / getMaxPerTeam()) * 100, 100)}%`, height: "100%", display: "block", background: "linear-gradient(90deg, #f97316, #dc2626)" }} />
                </div>

                <button
                  style={{
                    ...styles.joinRed,
                    opacity: getSelectedTeams().red.length >= getMaxPerTeam() ? 0.5 : 1,
                    cursor: getSelectedTeams().red.length >= getMaxPerTeam() ? "not-allowed" : "pointer",
                  }}
                  disabled={getSelectedTeams().red.length >= getMaxPerTeam()}
                  onClick={() => joinTeam("red")}
                >
                  {getSelectedTeams().red.length >= getMaxPerTeam() ? "Equipo Rojo lleno" : "Unirme al Equipo Rojo"}
                </button>

                <div style={styles.playersList}>
                  {getSelectedTeams().red.length === 0 ? (
                    <div style={styles.emptyTeam}>Esperando jugadores...</div>
                  ) : (
                    getSelectedTeams().red.map((player, index) => (
                      <div key={index} style={styles.playerItem}>
                        👤 {player}
                        <span>
                          {getSelectedTeams().confirmed.includes(player) ? "CONFIRMADO" : "LISTO"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div style={styles.roomActions}>
              <button style={styles.cancelBtn} onClick={() => setOpenRoom(false)}>
                Cerrar ventana
              </button>

              <button
                style={{
                  ...styles.leaveBtn,
                  opacity: isCurrentUserInSelectedRoom() ? 1 : 0.5,
                  cursor: isCurrentUserInSelectedRoom() ? "pointer" : "not-allowed",
                }}
                disabled={!isCurrentUserInSelectedRoom()}
                onClick={leaveCurrentRoom}
              >
                Retirarme del equipo
              </button>

              <button style={styles.startBtn} onClick={confirmParticipation}>
                Confirmar participación
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {showLoginModal && (
  <div style={styles.authOverlay}>
    <div style={styles.authModal}>
      <button
        style={styles.authClose}
        onClick={() => setShowLoginModal(false)}
      >
        ✕
      </button>

      <h2 style={styles.authTitle}>Entrar a Pucallpa Retos</h2>
      <p style={styles.authText}>Accede con tu cuenta de Google.</p>

      <button style={styles.googleBtnPremium} onClick={signInWithGoogle}>
        Continuar con Google
      </button>
    </div>
  </div>
)}
{showPhoneModal && (
  <div style={styles.authOverlay}>
    <div style={styles.authModal}>
      <h2 style={styles.authTitle}>📱 Último paso</h2>
      <p style={styles.authText}>
        Ingresa tu número de WhatsApp para poder unirte a las salas de juego.
      </p>
      <input
        style={styles.input}
        type="tel"
        placeholder="Ejemplo: 900123456"
        value={loginCelular}
        onChange={(e) => setLoginCelular(e.target.value)}
      />
      <input
  style={styles.input}
  type="text"
  placeholder="Nickname obligatorio"
  value={nicknameRegistro}
  onChange={(e) => setNicknameRegistro(e.target.value)}
/>
      <button
        style={styles.fullBtn}
       onClick={async () => {
  const celularLimpio = loginCelular.trim();
  const nicknameLimpio = nicknameRegistro.trim();

  if (!celularLimpio || celularLimpio.length < 9) {
    alert("Ingresa un número válido (mínimo 9 dígitos).");
    return;
  }

  if (!nicknameLimpio || nicknameLimpio.length < 3) {
    alert("Ingresa un nickname válido (mínimo 3 letras).");
    return;
  }

  if (usuarioPendiente) {
    const nuevoUsuario = {
      ...usuarioPendiente,
      celular: celularLimpio,
      nickname: nicknameLimpio,
    };

    const { data, error } = await supabase
      .from("players")
      .insert([nuevoUsuario])
      .select()
      .single();

  if (error) {
  console.error("Error buscando usuario:", error.message);
  setCargandoSesion(false);
  return;
}

    setUsuarioActivo(data);
    setUsuarioPendiente(null);
  } else {
    const { error } = await supabase
      .from("players")
      .update({
        celular: celularLimpio,
        nickname: nicknameLimpio,
      })
      .eq("id", usuarioActivo.id);

    if (error) {
      alert("Error guardando datos: " + error.message);
      return;
    }

    setUsuarioActivo((prev) => ({
      ...prev,
      celular: celularLimpio,
      nickname: nicknameLimpio,
    }));
  }

  setLoginCelular("");
  setNicknameRegistro("");
  setShowPhoneModal(false);
  cargarPlayers();
}}
      >
        Guardar y continuar
      </button>
    </div>
  </div>
)}

{showRegistrosModal && (
  <div style={styles.authOverlay}>
    <div style={styles.authModal}>
      <button
        style={styles.authClose}
        onClick={() => setShowRegistrosModal(false)}
      >
        ✕
      </button>

    <h2 style={styles.authTitle}>
  Usuarios registrados ({usuarios.length})
</h2>

<input
  placeholder="Buscar usuario..."
  style={styles.input}
/>

      <div style={{ maxHeight: "420px", overflowY: "auto" }}>
  {usuarios.map((user) => (
    <div
      key={user.id}
      style={{
        padding: "10px 0",
        borderBottom: "1px solid #333",
      }}
    >
      <strong>{user.nombre || "Sin nombre real"}</strong>

      <p style={{ ...styles.privateInfo, color: "#111827" }}>
        Nickname: {user.nickname || "No registrado"}
      </p>

      <p style={{ ...styles.privateInfo, color: "#111827" }}>
        Celular: {user.celular || "No registrado"}
      </p>

      <p style={{ ...styles.privateInfo, color: "#111827" }}>
        Gmail: {user.email || "No registrado"}
      </p>
    </div>
  ))}
</div>
    </div>
  </div>
)}
      {showPaymentModal && (
        <div style={styles.paymentOverlay}>
          <motion.div
            style={styles.paymentModal}
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <button
              style={styles.closePayment}
              onClick={() => setShowPaymentModal(false)}
            >
              ✕
            </button>

            <h2 style={styles.paymentTitle}>💸 Confirma tu participación</h2>

            <p style={styles.paymentText}>
              Realiza tu Yape para reservar tu slot deportivo.
            </p>

            <div style={styles.qrCropBox}>
              <img src={yapeQr} alt="QR Yape" style={styles.qrImage} />
            </div>

            <div style={styles.paymentNumber}>📞 Yape: 912494278</div>

            <a
              href="https://wa.me/51912494278"
              target="_blank"
              rel="noreferrer"
              style={styles.whatsappBtn}
            >
              💬 Enviar captura por WhatsApp
            </a>

            <button
              style={styles.paymentDoneBtn}
              onClick={() => {
                setShowPaymentModal(false);
                alert("Participación confirmada correctamente.");
              }}
            >
              ✅ Ya envié mi pago
            </button>

            <p style={styles.paymentFooter}>
              🔒 Tu pago asegura tu participación en la sala.
            </p>
          </motion.div>
          
        </div>
      )}
      {showRulesModal && (
  <div style={styles.rulesOverlay}>
    <motion.div
      style={styles.rulesModal}
      initial={{ scale: 0.9, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
    >
      <button
        style={styles.rulesCloseBtn}
        onClick={() => setShowRulesModal(false)}
      >
        ✕
      </button>

      <h2 style={styles.rulesModalTitle}>Reglas oficiales</h2>

      <div style={styles.rulesModalGrid}>
        <div style={styles.rulePremiumItem}>
          <strong>💰 Participación</strong>
          <span>Cada jugador paga S/ 10 por participar en el reto.</span>
        </div>

        <div style={styles.rulePremiumItem}>
          <strong>⭐ Puntos por participar</strong>
          <span>Cada participante recibe 10 puntos por jugar.</span>
        </div>

        <div style={styles.rulePremiumItem}>
          <strong>🏆 Premio al ganador</strong>
          <span>El ganador recibe S/ 5 y suma 10 puntos adicionales.</span>
        </div>

        <div style={styles.rulePremiumItem}>
          <strong>🎁 Canje de premios</strong>
          <span>Los premios se pueden reclamar desde 500 puntos como mínimo.</span>
        </div>
      </div>

      <div style={styles.rulesExampleBox}>
        <strong>Ejemplo:</strong>
        <p>
          Si juegas y pierdes: sumas 10 puntos. Si juegas y ganas:
          sumas 20 puntos en total y recibes S/ 5.
        </p>
      </div>
    </motion.div>
  </div>
)}
      <style>
  {`
    @media (max-width: 768px) {
      * {
        box-sizing: border-box !important;
      }

      html, body {
        width: 100% !important;
        overflow-x: hidden !important;
      }

      nav {
        width: calc(100% - 18px) !important;
        margin: 8px auto 0 !important;
        padding: 12px !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 12px !important;
      }

      nav img {
        width: 300px !important;
        height: auto !important;
        max-width: 100% !important;
      }

      main {
        width: 100% !important;
        padding: 18px 14px 50px !important;
        overflow-x: hidden !important;
      }

      h1 {
        font-size: 42px !important;
        line-height: 1.05 !important;
        letter-spacing: -1px !important;
      }

      section,
      div[style*="grid-template-columns"] {
        grid-template-columns: 1fr !important;
      }

      div[style*="display: grid"] {
        grid-template-columns: 1fr !important;
      }

      div[style*="display: flex"] {
        max-width: 100% !important;
      }

      button,
      a {
        max-width: 100% !important;
      }
    }
  `}
</style>
    </div>
 );
}



const styles = {
  userDropdown: {
  width: "320px",
  margin: "0 auto",
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
  overflow: "hidden",
},



logoutBtn: {
  width: "100%",
  padding: "14px",
  border: "none",
  background: "#ff4d4f",
  color: "#fff",
  fontWeight: "700",
  cursor: "pointer",
},
  page: {
  minHeight: "100vh",
  width: "100vw",
  overflowX: "hidden",
  background:
    "linear-gradient(135deg,#f7fff1 0%,#eaffd8 35%,#d8f8b6 65%,#b9ee85 100%)",
  color: "#06251a",
  fontFamily: "Inter, system-ui, sans-serif",
},

pattern: {
  minHeight: "100vh",
  width: "100%",
  backgroundImage:
    "radial-gradient(circle at 12% 45%, rgba(57,255,102,0.18), transparent 22%), radial-gradient(circle at 88% 20%, rgba(6,95,70,0.10), transparent 26%), repeating-linear-gradient(45deg, rgba(6,78,59,0.05) 0 2px, transparent 2px 26px)",
},

 navbar: {
  width: "calc(100% - 34px)",
  maxWidth: "1500px",
  margin: "8px auto 0",
  padding: "10px 44px",
  minHeight: "105px",

  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxSizing: "border-box",

  overflow: "visible",
  position: "relative",

  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(6,78,59,0.10)",
  borderRadius: "30px",
  boxShadow: "0 18px 55px rgba(6,78,59,0.16)",
},

logoImage: {
  width: "700px",
  height: "120px",
  objectFit: "contain",
  objectPosition: "left center",
  borderRadius: "0px",
  boxShadow: "none",
 
},

logoTextBox: {
  display: "flex",
  flexDirection: "column",
  lineHeight: "1",
},

logoMain: {
  fontSize: "24px",
  fontWeight: "950",
  letterSpacing: "1px",
  color: "#ffffff",
},

logo: {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  width: "620px",
  flexShrink: 0,
  overflow: "visible",
},

  logoIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #39ff66, #f97316)",
    color: "#022c22",
    display: "grid",
    placeItems: "center",
  },

 navLinks: {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "26px",
  flexWrap: "nowrap",
  minWidth: "420px",
  flexShrink: 0,
},
navLink: {
  color: "#06251a",
  textDecoration: "none",
  fontWeight: "950",
  fontSize: "18px",
},
  navAuthBtn: {
  padding: "18px 34px",
  borderRadius: "18px",
  border: "none",
  background: "linear-gradient(135deg,#059669,#16a34a)",
  color: "#ffffff",
  fontWeight: "950",
  fontSize: "20px",
  textDecoration: "none",
  boxShadow: "0 18px 36px rgba(22,163,74,0.30)",
  cursor: "pointer",
},
navUserBox: {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.18)",
},

navUserName: {
  color: "#ffffff",
  fontWeight: "900",
  maxWidth: "160px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
},

navLogoutBtn: {
  padding: "8px 12px",
  borderRadius: "999px",
  border: "none",
  background: "#fff5f5",
  color: "#dc2626",
  fontWeight: "900",
  cursor: "pointer",
},

  container: {
  width: "100%",
  maxWidth: "1500px",
  margin: "0 auto",
  padding: "65px 36px 70px",
  boxSizing: "border-box",
},

 hero: {
  textAlign: "center",
  padding: "0 0 65px",
},

  badge: {
  padding: "14px 24px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.62)",
  border: "1px solid rgba(6,95,70,0.16)",
  color: "#047857",
  fontWeight: "950",
  boxShadow: "0 12px 30px rgba(6,78,59,0.10)",
},

  title: {
  fontSize: "clamp(56px, 6vw, 96px)",
  lineHeight: "1.03",
  margin: "38px auto 24px",
  maxWidth: "1160px",
  fontWeight: "950",
  letterSpacing: "-3px",
  color: "#031f18",
  textShadow: "0 14px 30px rgba(6,78,59,0.12)",
},

  subtitle: {
  maxWidth: "900px",
  margin: "0 auto",
  color: "#334155",
  fontSize: "clamp(20px, 2vw, 28px)",
  lineHeight: "1.45",
},

 noticeBox: {
  maxWidth: "760px",
  margin: "34px auto",
  padding: "18px 28px",
  borderRadius: "22px",

  background: "rgba(255,248,220,0.75)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(251,191,36,.30)",

  color: "#7c4a03",
  boxShadow: "0 8px 18px rgba(0,0,0,.20)",
},
 sessionBanner: {
  display: "inline-flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 20px",
  background: "#0f172a",
  color: "#ffffff",
  borderRadius: "16px",
  fontWeight: "700",
  boxShadow: "0 8px 25px rgba(0,0,0,.25)",
  border: "1px solid rgba(255,255,255,.08)",
},
  heroButtons: {
    marginTop: "38px",
    display: "flex",
    justifyContent: "center",
    gap: "18px",
    flexWrap: "wrap",
  },

  primaryBtn: {
    padding: "16px 32px",
    borderRadius: "18px",
    border: "none",
    background: "linear-gradient(90deg, #39ff66, #f97316)",
    color: "#022c22",
    fontWeight: "950",
    cursor: "pointer",
    textDecoration: "none",
  },

  secondaryBtn: {
    padding: "16px 32px",
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    fontWeight: "900",
    cursor: "pointer",
    textDecoration: "none",
  },
  adminBtn: {
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "#fff",
  border: "none",
  borderRadius: "18px",
  padding: "14px 24px",
  fontWeight: "700",
  textDecoration: "none",
  boxShadow: "0 8px 18px rgba(37,99,235,.25)",
  transition: "all .2s ease",
},

rulesHeroBtn: {
  background: "linear-gradient(135deg,#16a34a,#22c55e)",
  color: "#ffffff",
  border: "none",
  borderRadius: "18px",
  padding: "14px 24px",
  fontWeight: "800",
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(22,163,74,.25)",
},
  gridPrincipal: {
    display: "grid",
    gridTemplateColumns: "1.4fr 0.8fr",
    gap: "30px",
    marginBottom: "30px",
  },

  

  cardGrande: {
    background: "rgba(255,255,255,0.96)",
    color: "#0f172a",
    borderRadius: "30px",
    padding: "34px",
    boxShadow: "0 28px 80px rgba(0,0,0,0.35)",
  },

  card: {
    background: "rgba(255,255,255,0.96)",
    color: "#0f172a",
    borderRadius: "30px",
    padding: "30px",
    boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "950",
    color: "#064e3b",
  },

  muted: {
    margin: "6px 0 0",
    color: "#64748b",
    lineHeight: "1.5",
  },

  mutedLight: {
    color: "rgba(255,255,255,0.78)",
  },

  sportTabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
    marginBottom: "24px",
    background: "#ecfdf5",
    padding: "8px",
    borderRadius: "22px",
  },

  tab: {
    padding: "15px",
    borderRadius: "16px",
    border: "none",
    background: "transparent",
    fontWeight: "900",
    cursor: "pointer",
    color: "#064e3b",
  },

  activeTab: {
    padding: "15px",
    borderRadius: "16px",
    border: "none",
    background: "linear-gradient(90deg, #064e3b, #10b981)",
    color: "white",
    fontWeight: "950",
    cursor: "pointer",
  },

  slotGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "20px",
  },

  slot: {
    minHeight: "190px",
    padding: "22px",
    borderRadius: "24px",
    background: "linear-gradient(180deg, #ffffff, #ecfdf5)",
    border: "2px solid rgba(16,185,129,0.18)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "16px",
    boxShadow: "0 16px 38px rgba(2,44,34,0.10)",
  },

  slotTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },

  statusAvailable: {
    padding: "6px 11px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#15803d",
    fontWeight: "900",
    fontSize: "13px",
  },

  statusReserved: {
    padding: "6px 11px",
    borderRadius: "999px",
    background: "#fee2e2",
    color: "#dc2626",
    fontWeight: "900",
    fontSize: "13px",
  },

  slotCapacityBox: {
    padding: "14px",
    borderRadius: "18px",
    background: "rgba(6,78,59,0.06)",
    border: "1px solid rgba(6,78,59,0.10)",
  },

  slotCapacityText: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#064e3b",
    fontWeight: "850",
    marginBottom: "10px",
  },

  slotMiniProgress: {
    width: "100%",
    height: "8px",
    borderRadius: "999px",
    overflow: "hidden",
    background: "rgba(15,23,42,0.10)",
  },

  slotMiniProgressSpan: {},

  slotBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#064e3b",
    fontWeight: "950",
    borderTop: "1px solid rgba(6,78,59,0.12)",
    paddingTop: "13px",
  },

  reserved: {
    background: "linear-gradient(180deg, #fff7f7, #ffedd5)",
    color: "#991b1b",
    cursor: "pointer",
    border: "2px solid rgba(239,68,68,0.25)",
  },

  fullBtn: {
    padding: "16px 24px",
    border: "none",
    borderRadius: "17px",
    background: "linear-gradient(90deg, #065f46, #10b981)",
    color: "white",
    fontWeight: "950",
    cursor: "pointer",
  },

 userLoggedBox: {
  display: "flex",
  alignItems: "center",
  gap: "10px",

  maxWidth: "240px",
  minWidth: "160px",

  padding: "10px 16px",
  borderRadius: "18px",

  background: "rgba(255,255,255,.60)",
  backdropFilter: "blur(10px)",

  border: "1px solid rgba(6,78,59,.10)",

  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",

  flexShrink: 0,
},
  userCompactBox: {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "16px",
  borderRadius: "22px",
  background: "#ecfdf5",
  color: "#064e3b",
},

userAvatar: {
  width: "50px",
  height: "50px",
  borderRadius: "50%",
  background: "linear-gradient(135deg,#065f46,#22c55e)",
  color: "#fff",
  display: "grid",
  placeItems: "center",
  fontWeight: "900",
  fontSize: "22px",
},

userCompactInfo: {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
},

adminMiniBadge: {
  color: "#f97316",
  fontWeight: "900",
},

logoutMiniBtn: {
  padding: "10px 14px",
  borderRadius: "14px",
  border: "1px solid #fecaca",
  background: "#fff5f5",
  color: "#dc2626",
  fontWeight: "900",
  cursor: "pointer",
},
  phoneBox: {
  marginTop: "14px",
  padding: "16px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid rgba(6,78,59,0.18)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
},

phoneTitle: {
  margin: 0,
  color: "#064e3b",
  fontWeight: "900",
  fontSize: "14px",
},

phoneInput: {
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
  outline: "none",
},

phoneBtn: {
  padding: "14px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(90deg, #065f46, #10b981)",
  color: "#ffffff",
  fontWeight: "950",
  cursor: "pointer",
},

  divider: {
    width: "100%",
    border: "none",
    borderTop: "1px solid #d1d5db",
    margin: "8px 0",
  },
 rewardsCard: {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(6,78,59,0.10)",
  borderRadius: "34px",
  padding: "36px",
  boxShadow: "0 28px 80px rgba(6,78,59,0.18)",
},
rewardsTitle: {
  margin: 0,
  fontSize: "32px",
  fontWeight: "950",
  color: "#064e3b",
},

rewardsText: {
  marginTop: "8px",
  color: "#475569",
},

rewardsGrid: {
  display: "grid",
  gap: "18px",
  marginTop: "24px",
},

rewardItem: {
  background: "#ecfdf5",
  borderRadius: "28px",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  border: "1px solid rgba(6,78,59,0.08)",
  minHeight: "430px",
},

rewardImage: {
  width: "100%",
  height: "240px",
  objectFit: "contain",
  objectPosition: "center",
  borderRadius: "22px",
  background: "#d1fae5",
},

rewardInfo: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: "900",
},

claimBtn: {
  border: "none",
  borderRadius: "14px",
  padding: "12px",
  background: "linear-gradient(90deg,#16a34a,#22c55e)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "900",
},

rewardAdminBox: {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginTop: "10px",
  paddingTop: "10px",
  borderTop: "1px solid rgba(6,78,59,0.10)",
},

rewardInput: {
  padding: "10px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
},
rewardDeleteBtn: {
  border: "none",
  borderRadius: "14px",
  padding: "12px",
  background: "#ef4444",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "900",
},

 form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  paymentOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.72)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: "20px",
  },

  paymentModal: {
    width: "100%",
    maxWidth: "430px",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: "34px",
    padding: "26px",
    textAlign: "center",
    position: "relative",
    boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
  },

  closePayment: {
    position: "absolute",
    top: "18px",
    right: "18px",
    border: "none",
    background: "#f1f5f9",
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "22px",
    color: "#0f172a",
  },

  paymentTitle: {
    color: "#064e3b",
    fontSize: "42px",
    fontWeight: "950",
    lineHeight: "1.05",
    marginBottom: "18px",
  },

  paymentText: {
    color: "#475569",
    marginBottom: "24px",
    lineHeight: "1.6",
    fontSize: "18px",
  },

  qrCropBox: {
    width: "270px",
    height: "270px",
    margin: "0 auto 22px",
    borderRadius: "30px",
    overflow: "hidden",
    background: "#8700b8",
    boxShadow: "0 15px 40px rgba(0,0,0,0.16)",
  },

  qrImage: {
    width: "270px",
    height: "270px",
    objectFit: "cover",
    objectPosition: "center top",
    transform: "translateY(-0px)",
  },

  paymentNumber: {
    padding: "18px",
    borderRadius: "24px",
    background: "#ecfdf5",
    color: "#064e3b",
    fontWeight: "950",
    marginBottom: "18px",
    fontSize: "22px",
  },

  whatsappBtn: {
    width: "100%",
    display: "block",
    padding: "20px",
    borderRadius: "24px",
    background: "linear-gradient(90deg, #16a34a, #22c55e)",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: "950",
    marginBottom: "16px",
    fontSize: "22px",
    boxSizing: "border-box",
  },

  paymentDoneBtn: {
    width: "100%",
    padding: "20px",
    borderRadius: "24px",
    border: "none",
    background: "linear-gradient(90deg, #064e3b, #10b981)",
    color: "#ffffff",
    fontWeight: "950",
    cursor: "pointer",
    fontSize: "22px",
  },

  paymentFooter: {
    marginTop: "22px",
    color: "#475569",
    fontWeight: "700",
    fontSize: "17px",
  },


  googleBtnPremium: {
    width: "100%",
    padding: "16px 18px",
    borderRadius: "22px",
    border: "1px solid rgba(148,163,184,0.25)",
    background:
      "linear-gradient(135deg, #ffffff 0%, #f8fafc 60%, #ecfdf5 100%)",
    color: "#0f172a",
    fontWeight: "950",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
  },

  googleIconWrap: {
    width: "48px",
    height: "48px",
    borderRadius: "18px",
    background: "#ffffff",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 8px 18px rgba(15,23,42,0.10)",
  },

  googleIconPremium: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background:
      "conic-gradient(from -45deg, #4285F4 0deg 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg 360deg)",
    color: "#ffffff",
    fontWeight: "950",
    fontSize: "18px",
  },

  googleTextWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    lineHeight: "1.2",
  },






  googleBtn: {
    width: "100%",
    padding: "15px 18px",
    borderRadius: "18px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: "950",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
  },

  googleIcon: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)",
    color: "#ffffff",
    fontWeight: "950",
  },

  loginDivider: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "12px",
    color: "#64748b",
    fontWeight: "800",
    margin: "2px 0",
  },

  loginDividerLine: {
    height: "1px",
    background: "#e5e7eb",
  },

  input: {
    padding: "16px",
    borderRadius: "16px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
  },

  playersSection: {
  marginTop: "30px",
  background: "linear-gradient(145deg, #f8fff8, #eefcf1)",
  border: "1px solid #bbf7d0",
  borderRadius: "30px",
  padding: "34px",
  boxShadow: "0 15px 40px rgba(0,0,0,0.08)",
},

  playersTitle: {
    margin: 0,
    fontSize: "34px",
    fontWeight: "950",
    color: "#064e3b",
  },

  playersText: {
    color: "#166534",
    lineHeight: "1.6",
  },

  playersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    marginTop: "24px",
  },

  playerCard: {
    background: "#dcfce7",
    border: "2px solid #16a34a",
    borderRadius: "24px",
    padding: "22px",
  },

  playerHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    alignItems: "flex-start",
  },

  playerMedal: {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(249,115,22,0.18)",
    border: "1px solid rgba(249,115,22,0.35)",
    color: "#fed7aa",
    fontWeight: "900",
    fontSize: "13px",
  },

  playerStats: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "10px",
    marginTop: "18px",
  },

  progressBar: {
    height: "10px",
    background: "rgba(255,255,255,0.12)",
    borderRadius: "999px",
    overflow: "hidden",
    marginTop: "18px",
  },

  playerActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "18px",
  },

  winBtn: {
    padding: "12px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(90deg, #15803d, #39ff66)",
    color: "#022c22",
    fontWeight: "950",
    cursor: "pointer",
  },

  loseBtn: {
    padding: "12px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(90deg, #991b1b, #f97316)",
    color: "white",
    fontWeight: "950",
    cursor: "pointer",
  },

  deleteBtn: {
  width: "100%",
  marginTop: "12px",
  padding: "11px",
  borderRadius: "14px",
  border: "1px solid #991b1b",
  background: "#7f1d1d",
  color: "#ffffff",
  fontWeight: "900",
  cursor: "pointer",
},
  
modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(255,255,255,0.92)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },

 roomModal: {
  width: "min(1050px, 94vw)",
  maxHeight: "88vh",
  overflowY: "auto",
  background: "linear-gradient(145deg, #ffffff, #f8fff9)",
  border: "1px solid #bbf7d0",
  borderRadius: "32px",
  padding: "34px",
  color: "#0f172a",
  boxShadow: "0 35px 110px rgba(0,0,0,0.22)",
  position: "relative",
},

  closeRoom: {
  position: "absolute",
  top: "18px",
  right: "18px",
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "14px",
  padding: "9px",
  cursor: "pointer",
  fontWeight: "900",
},

  roomHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },

  roomBadge: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid #39ff66",
    color: "#39ff66",
    fontWeight: "900",
  },

 roomInfo: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  background: "linear-gradient(135deg,#ecfdf5,#f8fff8)",
  border: "1px solid #bbf7d0",
  borderRadius: "18px",
  padding: "14px 16px",
  marginBottom: "14px",
  boxShadow: "0 8px 24px rgba(22,163,74,0.08)",
},

roomInfoTitle: {
  display: "block",
  color: "#064e3b",
  fontSize: "16px",
  fontWeight: "900",
},

roomInfoText: {
  color: "#166534",
  fontSize: "13px",
  margin: "4px 0 0",
},

roomInfoCounter: {
  minWidth: "92px",
  textAlign: "center",
  background: "#ffffff",
  border: "1px solid #dcfce7",
  borderRadius: "14px",
  padding: "9px 12px",
  color: "#064e3b",
  boxShadow: "0 6px 18px rgba(22,163,74,.08)",
  display: "grid",
  gap: "2px",
},

  roomInput: {
    width: "100%",
    padding: "16px",
    borderRadius: "16px",
    border: "1px solid rgba(57,255,102,0.35)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontSize: "16px",
    marginBottom: "22px",
  },

  teamsRoom: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "22px",
  },

  teamHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "14px",
  },

  teamProgress: {
    height: "9px",
    borderRadius: "999px",
    overflow: "hidden",
    background: "rgba(255,255,255,0.13)",
    marginBottom: "16px",
  },

  emptyTeam: {
  padding: "14px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.75)",
  border: "1px dashed #94a3b8",
  color: "#334155",
  fontWeight: "800",
  textAlign: "center",
},

 teamGreen: {
  background: "linear-gradient(145deg, #ecfdf5, #dcfce7)",
  border: "2px solid #22c55e",
  borderRadius: "26px",
  padding: "24px",
  boxShadow: "0 18px 45px rgba(22,163,74,0.14)",
},

teamRed: {
  background: "linear-gradient(145deg, #fff7ed, #fee2e2)",
  border: "2px solid #ef4444",
  borderRadius: "26px",
  padding: "24px",
  boxShadow: "0 18px 45px rgba(220,38,38,0.12)",
},
  joinGreen: {
  width: "100%",
  padding: "15px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(90deg, #166534, #22c55e)",
  color: "#ffffff",
  fontWeight: "950",
  cursor: "pointer",
  marginBottom: "16px",
  boxShadow: "0 10px 24px rgba(22,163,74,0.25)",
},

  joinRed: {
  width: "100%",
  padding: "15px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(90deg, #991b1b, #ef4444)",
  color: "#ffffff",
  fontWeight: "950",
  cursor: "pointer",
  marginBottom: "16px",
  boxShadow: "0 10px 24px rgba(220,38,38,0.24)",
},

  playersList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

 playerItem: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "13px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  color: "#0f172a",
  fontWeight: "900",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
},

  roomActions: {
  position: "sticky",
  bottom: 0,
  display: "flex",
  justifyContent: "flex-end",
  gap: "14px",
  marginTop: "26px",
  paddingTop: "18px",
  background: "#ffffff",
  borderTop: "1px solid #e5e7eb",
},

  cancelBtn: {
  flex: 1,
  padding: "14px 22px",
  borderRadius: "16px",
  border: "1px solid #fecaca",
  background: "#fff5f5",
  color: "#dc2626",
  fontWeight: "900",
  cursor: "pointer",
  transition: "0.2s",
},

  leaveBtn: {
    padding: "14px 22px",
    borderRadius: "14px",
    border: "1px solid rgba(249,115,22,0.55)",
    background: "rgba(249,115,22,0.16)",
    color: "#fed7aa",
    fontWeight: "900",
    cursor: "pointer",
  },

  startBtn: {
  flex: 1.2,
  padding: "14px 22px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(90deg, #16a34a, #22c55e)",
  color: "#ffffff",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(34,197,94,0.25)",
},

  adminBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #f59e0b, #f97316)",
    color: "#ffffff",
    fontWeight: "950",
    boxShadow: "0 10px 24px rgba(249,115,22,0.25)",
  },

  adminPanelNotice: {
    marginBottom: "22px",
    padding: "16px 18px",
    borderRadius: "18px",
    background: "rgba(249,115,22,0.14)",
    border: "1px solid rgba(249,115,22,0.35)",
    color: "#fed7aa",
    fontWeight: "900",
  },

  userPanelNotice: {
    marginBottom: "22px",
    padding: "16px 18px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#d1fae5",
    fontWeight: "850",
  },

  onlyAdminBox: {
    marginTop: "18px",
    padding: "13px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.08)",
    border: "1px dashed rgba(255,255,255,0.18)",
    color: "#d1fae5",
    fontWeight: "850",
    textAlign: "center",
  },
  authOverlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.68)",
  backdropFilter: "blur(8px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  padding: "20px",
},

authModal: {
  width: "100%",
  maxWidth: "430px",
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: "30px",
  padding: "30px",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  boxShadow: "0 30px 90px rgba(0,0,0,0.35)",
},

authClose: {
  position: "absolute",
  top: "16px",
  right: "16px",
  border: "none",
  background: "#f1f5f9",
  borderRadius: "50%",
  width: "40px",
  height: "40px",
  cursor: "pointer",
  fontWeight: "900",
},

authTitle: {
  margin: "10px 0 0",
  color: "#064e3b",
  fontSize: "30px",
  fontWeight: "950",
},

authText: {
  margin: 0,
  color: "#64748b",
},

authSwitchBtn: {
  border: "none",
  background: "transparent",
  color: "#065f46",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "4px",
},



 privateInfo: {
  color: "#111827",
  fontSize: "14px",
  marginTop: "6px",
  wordBreak: "break-word",
},

  publicInfo: {
    margin: "5px 0",
    color: "#d1fae5",
    fontWeight: "800",
    opacity: 0.9,
  },
  roomPhoneBox: {
  marginBottom: "20px",
  padding: "18px",
  borderRadius: "20px",
  background: "#ecfdf5",
  border: "1px solid rgba(6,78,59,0.18)",
  color: "#064e3b",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
},

roomPhoneForm: {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "12px",
  alignItems: "center",
},

profileBackdrop: {
  position: "fixed",
  inset: 0,
  background: "transparent",
  zIndex: 9998,
},

profileDropdown: {
  position: "absolute",
  top: "70px",
  right: "28px",
  width: "320px",
  background: "#ffffff",
  borderRadius: "18px",
  boxShadow: "0 18px 45px rgba(0,0,0,.22)",
  zIndex: 9999,
  padding: "14px",
  border: "1px solid rgba(0,0,0,.08)",
},

profileCardTop: {
  background: "#fff3e8",
  borderRadius: "14px",
  padding: "22px",
  textAlign: "center",
  marginBottom: "12px",
},

profileAvatarLarge: {
  width: "58px",
  height: "58px",
  borderRadius: "50%",
  background: "#16a34a",
  color: "#fff",
  display: "grid",
  placeItems: "center",
  fontWeight: "900",
  fontSize: "22px",
  margin: "0 auto 10px",
},

profileName: {
  display: "block",
  color: "#111827",
  fontSize: "15px",
  marginBottom: "4px",
},

profileEmail: {
  color: "#6b7280",
  fontSize: "13px",
},

profileMenuItem: {
  width: "100%",
  padding: "13px 12px",
  border: "none",
  background: "transparent",
  textAlign: "left",
  fontSize: "14px",
  cursor: "pointer",
  borderRadius: "10px",
  color: "#111827",
},
profileStatsGrid: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "12px",
  marginBottom: "12px",
},

profileStatCard: {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "12px",
  textAlign: "center",
  transition: "all .2s ease",
},

profileStatLabel: {
  display: "block",
  fontSize: "11px",
  fontWeight: "700",
  color: "#64748b",
  textTransform: "uppercase",
  marginBottom: "6px",
  letterSpacing: ".5px",
},

profileStatValue: {
  display: "block",
  fontSize: "15px",
  fontWeight: "900",
  color: "#0f172a",
},

profileLogout: {
  width: "100%",
  padding: "14px",
  border: "none",
  background: "#fee2e2",
  color: "#dc2626",
  textAlign: "center",
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer",
  borderRadius: "12px",
  marginTop: "10px",
  transition: "all .2s ease",
},
googleUserChip: {
  display: "flex",
  alignItems: "center",
  gap: "10px",

  padding: "8px 14px",
  borderRadius: "999px",

  background: "rgba(255,255,255,.72)",
  backdropFilter: "blur(12px)",

  border: "1px solid rgba(6,78,59,.10)",

  boxShadow: "0 8px 20px rgba(6,78,59,.08)",

  maxWidth: "250px",
  flexShrink: 0,
},

googleAvatar: {
  width: "38px",
  height: "38px",
  borderRadius: "50%",

  background:
    "linear-gradient(135deg,#16a34a,#22c55e)",

  color: "#fff",
  display: "grid",
  placeItems: "center",

  fontWeight: "900",
  fontSize: "16px",
},

googleUserName: {
  maxWidth: "110px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "#064e3b",
  fontWeight: "900",
  fontSize: "15px",
},

adminRewardsBox: {
  background: "#ecfdf5",
  border: "1px dashed rgba(6,78,59,.25)",
  borderRadius: "22px",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginBottom: "20px",
},
emptyRewards: {
  padding: "30px",
  borderRadius: "22px",
  background: "#ecfdf5",
  border: "1px dashed rgba(6,78,59,0.25)",
  color: "#064e3b",
  fontWeight: "900",
  textAlign: "center",
},
pointsAdminBox: {
  marginTop: "18px",
  padding: "14px",
  borderRadius: "16px",
 background: "#bbf7d0",
border: "2px solid #15803d",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
},

pointsLabel: {
 color: "#052e16",
  fontWeight: "900",
  fontSize: "13px",
},

pointsInput: {
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(57,255,102,0.35)",
 background: "#f0fdf4",
color: "#052e16",
fontSize: "16px",
  fontWeight: "900",
},
rulesMiniBox: {
  display: "flex",
  alignItems: "center",
  gap: "14px",
},

rulesMiniBtn: {
  border: "none",
  borderRadius: "999px",
  padding: "10px 18px",
  background: "linear-gradient(90deg,#16a34a,#22c55e)",
  color: "#ffffff",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(34,197,94,0.22)",
},

rulesOverlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.62)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
  padding: "20px",
},

rulesModal: {
  width: "100%",
  maxWidth: "560px",
  background: "linear-gradient(145deg,#ffffff,#ecfdf5)",
  borderRadius: "32px",
  padding: "32px",
  position: "relative",
  boxShadow: "0 30px 90px rgba(0,0,0,0.30)",
  border: "1px solid rgba(6,78,59,0.12)",
},

rulesCloseBtn: {
  position: "absolute",
  top: "18px",
  right: "18px",
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  border: "none",
  background: "#f1f5f9",
  color: "#064e3b",
  fontWeight: "950",
  cursor: "pointer",
},

rulesModalTitle: {
  margin: "0 0 20px",
  color: "#064e3b",
  fontSize: "34px",
  fontWeight: "950",
},

rulesModalGrid: {
  display: "grid",
  gap: "14px",
},

rulePremiumItem: {
  padding: "16px",
  borderRadius: "20px",
  background: "#ffffff",
  border: "1px solid rgba(6,78,59,0.10)",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  color: "#064e3b",
},

rulesExampleBox: {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "20px",
  background: "#dcfce7",
  color: "#065f46",
  fontWeight: "800",
},

};