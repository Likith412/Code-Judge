# The Java sandbox. Build it with: npm run judge:images
# Only the JDK and one script. No compilers for anything else, no tools.
FROM eclipse-temurin:21-jdk

COPY judge.sh /judge/judge.sh
RUN chmod 555 /judge/judge.sh

# Never root. 1000 is the image's existing non-root user.
USER 1000:1000
WORKDIR /box

# The container just waits. Every compile and run is a docker exec.
CMD ["sleep", "infinity"]
