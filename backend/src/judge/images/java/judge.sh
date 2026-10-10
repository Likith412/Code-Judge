#!/bin/sh
# The only way code runs in this image. Exit codes are the contract:
#   20  did not compile, the compiler's message is on stderr
#   124 ran past the wall-clock cap (coreutils timeout)
#   137 killed, which here means it ran out of memory
#   else the program's own exit code

case "$1" in
   compile)
      cd /box || exit 1
      javac -encoding UTF-8 Main.java || exit 20
      ;;
   run)
      # $2 is the wall-clock cap in seconds, decimals allowed. The real time
      # limit is CPU time, which the judge reads from Docker after the run.
      # The heap gets 80% of the container, the rest is the JVM's own.
      # G1, because Serial cannot fit one big array in two thirds of the heap.
      # JVM warnings go to stderr, or they would be judged as output.
      # A 64 MB stack, so deep recursion works. Unused stack costs nothing.
      exec timeout -s KILL "$2" java \
         -XX:MaxRAMPercentage=80 \
         -XX:+UseG1GC \
         -XX:-UsePerfData \
         -Xlog:disable -Xlog:all=warning:stderr \
         -Xss64m \
         -cp /box Main
      ;;
   *)
      echo "usage: judge.sh compile | run <seconds>" >&2
      exit 2
      ;;
esac
