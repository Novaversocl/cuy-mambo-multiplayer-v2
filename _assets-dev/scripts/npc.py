import keyboard
import time

def ejecutar():
    print("Iniciando en 5 segundos...")
    time.sleep(5)

    inicio = time.time()

    # 👉 Avanzar a la derecha SOLO 1 vez
    keyboard.press_and_release("right")
    time.sleep(0.2)

    # 👉 Presionar Enter 5 veces
    for _ in range(5):
        keyboard.press_and_release("enter")
        time.sleep(0.3)

    # 👉 Presionar Espacio 3 veces (saltar/disparar)
    for _ in range(3):
        keyboard.press_and_release("space")
        time.sleep(0.4)

    # 👉 Completar hasta 10 segundos totales
    while time.time() - inicio < 10:
        time.sleep(0.1)

    print("✅ Secuencia terminada")

# 🔁 Repetir o salir
while True:
    ejecutar()

    opcion = input("¿Deseas ejecutar nuevamente? (s/n): ").lower()
    if opcion != "s":
        print("Programa finalizado")
        break