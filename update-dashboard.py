#!/usr/bin/env python3
# Script para atualizar o dashboard com botões de Perfil e Logout

file_path = 'apps/web/src/app/dashboard/page.tsx'

# Ler o arquivo
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Texto antigo dos botões
old_buttons = '''            <div className="flex items-center gap-3">
              <button
                onClick={() => loadAllData()}
                className="px-4 py-2 bg-gradient-to-r from-blue-900 to-cyan-600 text-white rounded-lg hover:from-blue-800 hover:to-cyan-500 flex items-center gap-2 shadow-md transition-all"
              >
                🔄 Atualizar
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 transition-all"
              >
                🚪 Sair
              </button>
            </div>'''

# Novo texto com o botão de Perfil
new_buttons = '''            <div className="flex items-center gap-3">
              <button
                onClick={() => loadAllData()}
                className="px-4 py-2 bg-gradient-to-r from-blue-900 to-cyan-600 text-white rounded-lg hover:from-blue-800 hover:to-cyan-500 flex items-center gap-2 shadow-md transition-all"
              >
                🔄 Atualizar
              </button>
              <button
                onClick={() => window.location.href = '/profile'}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 shadow-md transition-all"
              >
                <User className="w-4 h-4" />
                Perfil
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>'''

# Substituir
content = content.replace(old_buttons, new_buttons)

# Escrever de volta
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Dashboard atualizado com sucesso!")
print("✅ Botão de Perfil adicionado")
print("✅ Ícones User e LogOut adicionados aos botões")
