import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { update } from '../lib/db.js';
import { fail, ok } from '../alerts.js';
import Page from '../components/Page.jsx';

export default function Profile() {
  const { user } = useAuth();
  const [f, setF] = useState({ cur: '', next: '', rep: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (f.cur !== user.password) return fail('La contraseña actual no es correcta');
    if (f.next.length < 6) return fail('La nueva contraseña necesita al menos 6 caracteres');
    if (f.next !== f.rep) return fail('Las contraseñas nuevas no coinciden');
    update((d) => { const u = d.users.find((x) => x.id === user.id); u.password = f.next; delete u.mustChange; });
    setF({ cur: '', next: '', rep: '' });
    ok('Contraseña actualizada');
  };
  const rows = [['Nombre', user.name], ['Rol', user.role], user.sis && ['Código SIS', user.sis], user.email && ['Correo', user.email], user.carnet && ['Carnet', user.carnet]].filter(Boolean);
  return (
    <Page crumb="Academy › Perfil" title="Mi perfil">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card flex flex-col gap-2">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between border-b border-white/10 py-1.5"><span className="text-blue-200">{k}</span><b className="capitalize">{v}</b></div>)}
        </div>
        <form onSubmit={submit} className="card flex flex-col gap-3">
          <b>Cambiar contraseña</b>
          <input className="input" type="password" placeholder="Contraseña actual" value={f.cur} onChange={set('cur')} />
          <input className="input" type="password" placeholder="Nueva contraseña" value={f.next} onChange={set('next')} />
          <input className="input" type="password" placeholder="Repite la nueva contraseña" value={f.rep} onChange={set('rep')} />
          <button className="btn">Guardar</button>
        </form>
      </div>
    </Page>
  );
}
